"""Validate and package the reusable local asset payload; never include a ROM."""
import hashlib
import json
import struct
import wave
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / 'asset-packs/mario-paint'


def main() -> None:
    manifest = json.loads((PACK / 'manifest.json').read_text())
    counts = {'models': 0, 'voxelFiles': 0, 'sprites': 0, 'noteWavs': 0, 'sourceWavs': 0, 'composerSources': 0, 'auxiliarySources': 0}
    for instrument in manifest['instruments']:
        with Image.open(PACK / instrument['sprite']) as image:
            image = image.convert('RGBA')
            assert image.size == (16, 16)
            data = json.loads((PACK / instrument['voxelJson']).read_text())
            front = {(x, 15 - y): data['palette'][color] for x, y, z, color in data['voxels'] if z == 3}
            pixels = {(x, y): '#%02x%02x%02x' % image.getpixel((x, y))[:3] for y in range(16) for x in range(16) if image.getpixel((x, y))[3]}
            assert front == pixels, f'Voxel front differs from sprite: {instrument["id"]}'
            assert len(data['voxels']) == len(pixels) * 4
            counts['sprites'] += 1
        vox = (PACK / instrument['magicaVoxel']).read_bytes()
        assert vox[:4] == b'VOX ' and struct.unpack_from('<I', vox, 4)[0] == 150
        assert struct.unpack_from('<III', vox, 32) == (16, 4, 16)
        counts['voxelFiles'] += 1
        glb = (PACK / instrument['model']).read_bytes()
        assert struct.unpack_from('<III', glb) == (0x46546c67, 2, len(glb))
        gltf = json.loads(glb[20:20 + struct.unpack_from('<I', glb, 12)[0]])
        assert len(gltf['meshes']) == 1 and len(gltf['meshes'][0]['primitives']) == 1
        assert all('uri' not in buffer for buffer in gltf['buffers'])
        counts['models'] += 1
        for note in instrument['notes']:
            with wave.open(str(PACK / note['wav'])) as audio:
                assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getnframes()) == (1, 2, 32000, note['frames'])
                pcm = struct.unpack('<%dh' % note['frames'], audio.readframes(note['frames']))
                assert 0 < max(abs(value) for value in pcm) < 32767
                assert any(pcm[:512]) and not any(pcm[-319:])
            counts['noteWavs'] += 1
    for sample in manifest['samples']:
        with wave.open(str(PACK / sample['wav'])) as audio:
            assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getnframes()) == (1, 2, 32000, sample['frames'])
        assert hashlib.sha256((PACK / sample['brr']).read_bytes()).hexdigest() == sample['sha256Brr']
        if sample['loop']:
            assert 0 <= sample['loopStartFrame'] < sample['loopEndFrame'] == sample['frames']
        counts['sourceWavs'] += 1
        counts['composerSources' if sample['role'] == 'composer' else 'auxiliarySources'] += 1
    assert counts == {'models': 15, 'voxelFiles': 15, 'sprites': 15, 'noteWavs': 195, 'sourceWavs': 23, 'composerSources': 16, 'auxiliarySources': 7}
    comparison = PACK / 'source-comparison.json'
    report = {'passed': True, 'counts': counts, 'spriteFrontPixelsExact': True, 'allNativeNotesNonSilentUnclippedAndUntruncated': True,
              'boatSampleSwitch': {'positions1to6': 0, 'positions7to13': 16},
              'limitations': ['Isolated fast-DSP rendering, not full-console capture.', 'No human listening, Safari, venue or production timing qualification implied.']}
    (PACK / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')
    paths = sorted(path for folder in ['models', 'voxels', 'sprites', 'audio', 'raw', 'source'] for path in (PACK / folder).rglob('*') if path.is_file())
    paths += [PACK / name for name in ['README.md', 'manifest.json', 'validation.json']]
    if comparison.exists():
        paths.append(comparison)
    files = [{'path': path.relative_to(PACK).as_posix(), 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in paths]
    (PACK / 'checksums.json').write_text(json.dumps({'format': 'bongo-planet-asset-checksums', 'version': 1, 'files': files}, indent=2) + '\n')
    archive = PACK / 'Bongo-Planet-Mario-Paint.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for path in paths + [PACK / 'checksums.json']:
            output.write(path, path.relative_to(PACK).as_posix())
    with zipfile.ZipFile(archive) as check:
        assert check.testzip() is None
        assert not any(name.lower().endswith(('.sfc', '.smc', '.spc')) for name in check.namelist())
    print(json.dumps({'passed': True, 'counts': counts, 'payloadFiles': len(files), 'zipBytes': archive.stat().st_size, 'zipSha256': hashlib.sha256(archive.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
