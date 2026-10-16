"""Mario Paint LoROM / BRR primitives, reused from the verified local extractor."""
import struct
import wave
from PIL import Image

def save_wav(path, pcm, channels=1):
    with wave.open(str(path),'wb') as w:
        w.setnchannels(channels);w.setsampwidth(2);w.setframerate(32000)
        w.writeframes(struct.pack('<%dh'%len(pcm),*pcm))

def decode_brr(brr):
    """SNES integer BRR decode, before interpolation, pitch and envelope."""
    pcm=[];p1=p2=0
    for pos in range(0,len(brr),9):
        h=brr[pos];shift=h>>4;f=h&12
        for b in brr[pos+1:pos+9]:
            for n in (b>>4,b&15):
                n=n-16 if n>=8 else n
                s=(n<<shift)>>1 if shift<=12 else (-2048 if n<0 else 0)
                prev2=p2>>1
                if f>=8:
                    s+=p1-prev2
                    if f==8:s+=(prev2>>4)+((p1*-3)>>6)
                    else:s+=((p1*-13)>>7)+((prev2*3)>>4)
                elif f:s+=(p1>>1)+((-p1)>>5)
                s=max(-32768,min(32767,s));s=((s*2+32768)%65536)-32768
                pcm.append(s);p2,p1=p1,s
    return pcm

def offset(addr):
    return ((addr >> 16) & 0x7f) * 0x8000 + (addr & 0x7fff)

def upload(rom, addr, ram):
    pos = offset(addr)
    blocks = []
    while True:
        length, dest = struct.unpack_from('<HH', rom, pos)
        if not length:
            return blocks, dest
        assert dest + length <= 65536
        ram[dest:dest+length] = rom[pos+4:pos+4+length]
        blocks.append({'fileOffset':pos+4,'aramAddress':dest,'length':length})
        pos += 4+length

def tiles(data, palette, width=16):
    count = len(data)//32
    im = Image.new('RGBA', (width*8, ((count+width-1)//width)*8))
    for i in range(count):
        t = data[i*32:i*32+32]
        for y in range(8):
            for x in range(8):
                bit=7-x
                c=sum(((t[y*2+p%2+(p//2)*16]>>bit)&1)<<p for p in range(4))
                im.putpixel(((i%width)*8+x,(i//width)*8+y),palette[c])
    return im

