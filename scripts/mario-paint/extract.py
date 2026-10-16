"""Build the small, local Mario Paint instrument pack from a supplied ROM.

No ROM, ARAM dump, diagnostic graphics, recordings or old research tree are
retained. Native tables are pinned to the previously verified disassembly.
"""
import argparse
import array
import hashlib
import json
import re
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

from native import decode_brr, offset, save_wav, tiles, upload

ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path(__file__).resolve().parent
OUTPUT = ROOT / 'asset-packs/mario-paint'
ROM_SHA256 = 'ef1b5c47d7c76de43492d9745def235fa24e01b9b6f5c636584b7ae639563ff2'
REFERENCE = 'https://github.com/Yoshifanatic1/Mario-Paint-Disassembly/tree/730df333bd4110da7965e0ad063c1c5dcf894a73'
NAMES = ['mario', 'mushroom', 'yoshi', 'star', 'flower', 'game-boy', 'dog', 'cat', 'pig', 'swan', 'baby', 'airplane', 'boat', 'car', 'heart']
TIMBRES = ['Mallet / xylophone', 'Tom / drum', 'Yoshi voice', 'Music box', 'Trumpet', 'Pulse wave', 'Dog bark', 'Cat meow', 'Pig oink', 'Orchestra hit', 'Baby voice', 'Bowed strings', 'Drum / cymbal split', 'Organ', 'Bass pluck']
STAFF = ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5']


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')


def vox_chunk(name: bytes, content: bytes, children: bytes = b'') -> bytes:
    return name + struct.pack('<II', len(content), len(children)) + content + children


def write_vox(path: Path, voxels: list, palette: list) -> None:
    # MagicaVoxel axes: X right, Y into the extrusion, Z up.
    cells = bytes(component for x, y, z, color in voxels for component in (x, z, y, color + 1))
    colors = b''.join(bytes.fromhex(color[1:]) + b'\xff' for color in palette)
    colors += b'\x00' * (1024 - len(colors))
    children = vox_chunk(b'SIZE', struct.pack('<III', 16, 4, 16))
    children += vox_chunk(b'XYZI', struct.pack('<I', len(voxels)) + cells)
    children += vox_chunk(b'RGBA', colors)
    path.write_bytes(b'VOX ' + struct.pack('<I', 150) + vox_chunk(b'MAIN', b'', children))


def main(rom_path: Path) -> None:
    rom = rom_path.read_bytes()
    if len(rom) == 0x100200:
        rom = rom[512:]
    digest = hashlib.sha256(rom).hexdigest()
    if len(rom) != 0x100000 or rom[0x7fc0:0x7fca] != b'MARIOPAINT' or digest != ROM_SHA256:
        raise ValueError('This extractor requires the verified Mario Paint Joystick modification 1.0 ROM; the input was not changed.')
    ram = bytearray(65536)
    upload(rom, 0x188000, ram)
    upload(rom, 0x1c8000, ram)
    for address, check in json.loads((TOOLS / 'native-tables.json').read_text()).items():
        start = int(address, 16)
        if hashlib.sha256(ram[start:start + check['length']]).hexdigest() != check['sha256']:
            raise ValueError(f'Native composer table mismatch at ${address}.')

    for folder in ['sprites', 'voxels', 'models', 'audio/notes', 'audio/sources', 'audio/auxiliary', 'raw']:
        (OUTPUT / folder).mkdir(parents=True, exist_ok=True)
    palette = [tuple(((c >> shift) & 31) * 255 // 31 for shift in (0, 5, 10)) + (255,)
               for c in struct.unpack_from('<256H', rom, offset(0x02fe00))]
    icon_palette = palette[128:144].copy()
    icon_palette[0] = (0, 0, 0, 0)
    sheet = tiles(rom[offset(0x0ac000):offset(0x0ac000) + 0x800], icon_palette)
    active = set(ram[0x254c:0x254c + 15]) | {16}
    manifest = {
        'format': 'bongo-planet-instrument-pack', 'version': 1,
        'id': 'mario-paint', 'name': 'Mario Paint instrument library for Bongo Planet',
        'source': {'romSha256': digest, 'reference': REFERENCE,
                   'note': 'Extracted read-only from the retained user-supplied ROM. No ROM is bundled.'},
        'rights': {'owner': 'Nintendo', 'status': 'Nintendo-derived local assets; no redistribution license established.',
                   'codeLicenseDoesNotLicenseAssets': True},
        'compatibility': {
            'models': 'glTF 2.0 GLB, one vertex-colored mesh per sprite; Three.js compatible.',
            'modelAxes': 'X right, Y up, Z outward from the Bongo Planet surface; origin at the center of the sprite canvas on the mounting plane.',
            'pixelSize': 0.009, 'depthPixels': 4, 'surfaceLift': 0.005,
            'audio': 'Mono signed 16-bit little-endian PCM WAV, 32000 Hz; same PCM sample shape as src/audio/samples.ts.',
            'nativePitch': '13 original staff positions. Labels are positions on the native staff, not universal concert-pitch roots.',
            'productionCatalog': 'Separate library; IDs are not registered in production compositions or the main palette.',
        },
        'staffLabels': STAFF, 'samples': [], 'instruments': [],
    }
    for sample_index in range(23):
        start, loop = struct.unpack_from('<HH', ram, 0x6c00 + 4 * sample_index)
        end = start
        while end + 9 <= 65536:
            header = ram[end]
            end += 9
            if header & 1:
                break
        else:
            raise ValueError(f'Unterminated BRR sample {sample_index}.')
        brr = bytes(ram[start:end])
        if not start <= loop <= end or (loop - start) % 9 or (header & 2 and loop == end):
            raise ValueError('Invalid BRR loop pointer.')
        pcm = decode_brr(brr)
        role = 'composer' if sample_index in active else 'auxiliary'
        wav_path = f'audio/{"sources" if role == "composer" else "auxiliary"}/sample-{sample_index:02x}.wav'
        raw_path = f'raw/sample-{sample_index:02x}.brr'
        (OUTPUT / raw_path).write_bytes(brr)
        save_wav(OUTPUT / wav_path, pcm)
        settings = ram[0x6e00 + sample_index * 6:0x6e00 + (sample_index + 1) * 6]
        manifest['samples'].append({
            'index': sample_index, 'role': role, 'wav': wav_path, 'brr': raw_path,
            'sha256Brr': hashlib.sha256(brr).hexdigest(), 'frames': len(pcm), 'sampleRate': 32000,
            'nominalRateIsNotRootPitch': True, 'loop': bool(header & 2),
            'loopStartFrame': (loop - start) // 9 * 16, 'loopEndFrame': len(pcm),
            'native': {'adsr1': settings[1], 'adsr2': settings[2], 'gain': settings[3],
                       'tuningBigEndian': settings[4] * 256 + settings[5], 'aramStart': start, 'aramLoop': loop},
        })

    with tempfile.TemporaryDirectory(prefix='bongo-mario-paint-') as temporary:
        temporary = Path(temporary)
        (temporary / 'aram.bin').write_bytes(ram)
        executable = temporary / 'render'
        library = TOOLS / 'spc-dsp'
        subprocess.run(['clang++', '-std=c++17', '-O2', '-DNDEBUG', '-DBLARGG_LITTLE_ENDIAN=1',
                        str(TOOLS / 'render.cpp'), *[str(library / f) for f in ['Snes_Spc.cpp', 'Spc_Cpu.cpp', 'Spc_Dsp.cpp']],
                        '-o', str(executable)], check=True)
        for i, name in enumerate(NAMES):
            slug = f'{i:02d}-{name}'
            x, y = i % 8 * 16, i // 8 * 16
            icon = sheet.crop((x, y, x + 16, y + 16))
            icon.save(OUTPUT / 'sprites' / f'{slug}.png')
            color_values = sorted({pixel[:3] for pixel in icon.getdata() if pixel[3]})
            voxel_palette = ['#' + ''.join(f'{c:02x}' for c in color) for color in color_values]
            color_indices = {color: index for index, color in enumerate(color_values)}
            voxels = [[px, 15 - py, z, color_indices[icon.getpixel((px, py))[:3]]]
                      for py in range(16) for px in range(16) if icon.getpixel((px, py))[3]
                      for z in range(4)]
            voxel_data = {'format': 'bongo-planet-voxel-sprite', 'version': 1, 'id': name,
                          'size': [16, 16, 4], 'axes': 'x-right-y-up-z-outward',
                          'pixelSize': 0.009, 'surfaceLift': 0.005, 'palette': voxel_palette, 'voxels': voxels}
            write_json(OUTPUT / 'voxels' / f'{slug}.json', voxel_data)
            write_vox(OUTPUT / 'voxels' / f'{slug}.vox', voxels, voxel_palette)
            sample = ram[0x254c + i]
            inst = {
                'id': name, 'bongoId': f'mario-paint-{name}', 'composerIndex': i,
                'name': 'Game Boy' if name == 'game-boy' else name.title(), 'timbre': TIMBRES[i],
                'sprite': f'sprites/{slug}.png', 'model': f'models/{slug}.glb',
                'voxelJson': f'voxels/{slug}.json', 'magicaVoxel': f'voxels/{slug}.vox',
                'opaquePixels': len(voxels) // 4, 'voxelCount': len(voxels),
                'primarySampleIndex': sample,
                'native': {'volume': ram[0x256a + i], 'pan': ram[0x2588 + i],
                           'finePitch': ram[0x2687 + i], 'maxDurationTicks': ram[0x26a5 + i]},
                'notes': [],
            }
            notes_dir = OUTPUT / 'audio/notes' / slug
            notes_dir.mkdir(exist_ok=True)
            for n, label in enumerate(STAFF, start=1):
                pcm_file = temporary / 'note.pcm'
                result = subprocess.run([str(executable), str(temporary / 'aram.bin'), str(i), str(n), str(pcm_file)],
                                        capture_output=True, text=True, check=True)
                actual = {key: int(value) for key, value in re.findall(r'(\w+)=(\d+)', result.stdout)}
                expected_sample = 16 if i == 12 and n >= 7 else sample
                nspc = ram[0x25c4 + ram[0x25a6 + i] + n - 1]
                if actual['sample'] != expected_sample or actual['nspc'] != nspc or actual['mode'] != 1 or actual['fine'] != inst['native']['finePitch']:
                    raise ValueError(f'Native note mismatch: {result.stdout}')
                pcm = array.array('h')
                pcm.frombytes(pcm_file.read_bytes())
                if sys.byteorder != 'little':
                    pcm.byteswap()
                audible = [frame for frame in range(len(pcm) // 2) if pcm[frame * 2] or pcm[frame * 2 + 1]]
                if not audible or audible[-1] >= 60800:
                    raise ValueError(f'Silent or truncated note {name} {label}.')
                start, end = max(0, audible[0] - 16), min(64000, audible[-1] + 321)
                stereo = pcm[start * 2:end * 2]
                mono = [(stereo[j] + stereo[j + 1]) // 2 for j in range(0, len(stereo), 2)]
                peak = max(abs(value) for value in mono)
                if not 0 < peak < 32767:
                    raise ValueError(f'Silent or clipped mono note {name} {label}.')
                wav_path = f'audio/notes/{slug}/{n:02d}-{label}.wav'
                save_wav(OUTPUT / wav_path, mono)
                inst['notes'].append({'staffPosition': n, 'staffLabel': label, 'sampleIndex': expected_sample,
                                      'nspcNote': nspc, 'wav': wav_path, 'frames': len(mono),
                                      'sampleRate': 32000, 'durationSeconds': len(mono) / 32000,
                                      'removedLeadingFrames': start, 'peak': peak, 'normalization': False})
            manifest['instruments'].append(inst)
            print(f'{i + 1:02d}/15  {name}: {len(voxels)} voxels, 13 original notes', flush=True)

    manifest['audioRendering'] = {
        'method': 'ROM SPC700 composer driver + Game_Music_Emu fast DSP; native gates, tuning, envelopes and channel fold-down; dry / echo disabled.',
        'limitation': 'Isolated digital render; fast DSP approximates interpolation/timing. Not a full-console or analog recording.',
        'trim': 'Native command latency removed; retain 16 leading frames and 320 trailing frames.',
        'library': json.loads((TOOLS / 'spc-dsp/provenance.json').read_text()),
    }
    write_json(OUTPUT / 'manifest.json', manifest)
    print(f'Wrote {len(manifest["instruments"])} instruments, 195 note WAVs and 23 source WAVs to {OUTPUT}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('rom', type=Path)
    main(parser.parse_args().rom)
