// Run the ROM's own SPC700 composer voice routine using Game_Music_Emu.
#include "spc-dsp/Snes_Spc.h"
#include <fstream>
#include <vector>
#include <iostream>
#include <cstring>
#include <algorithm>

int main(int argc, char** argv) {
    if (argc != 5) { std::cerr << "render aram.bin instrument staffPosition output.pcm\n"; return 2; }
    std::vector<unsigned char> ram(65536);
    std::ifstream in(argv[1], std::ios::binary); in.read((char*)ram.data(),ram.size());
    if (!in) return 3;
    Snes_Spc spc; if (auto e=spc.init()) { std::cerr<<e;return 4; }
    std::vector<unsigned char> snapshot(Snes_Spc::spc_file_size,0);
    std::memcpy(snapshot.data(),"SNES-SPC700 Sound File Data v0.30\x1a\x1a",35);
    snapshot[0x23]=0x1b; snapshot[0x24]=30;
    snapshot[0x25]=0; snapshot[0x26]=5; // PC=$0500: original engine initialization
    snapshot[0x2b]=0xcf;
    std::memcpy(snapshot.data()+0x100,ram.data(),ram.size());
    snapshot[0x100+0xf1]=0; // IPL disabled; engine enables its timer
    snapshot[0x10100+0x6c]=0x20; // disable echo writes
    if (auto e=spc.load_spc(snapshot.data(),snapshot.size())) {std::cerr<<e;return 5;}
    std::vector<short> warm(6400);
    if (auto e=spc.play(warm.size(),warm.data())) {std::cerr<<e;return 6;}
    auto r=spc.smp_ram();
    // Select composer mode without starting one of the preset background songs.
    // The ROM's command parser/voice/envelope/pitch routines are unmodified.
    r[0x00]=1; r[0x04]=1; r[0x08]=1; r[0x0c]=0;
    r[0x59]=0xc0; r[0x53]=0x20;
    int inst=std::stoi(argv[2]), note=std::stoi(argv[3]);
    if(inst<0 || inst>14 || note<1 || note>13)return 7;
    spc.write_port(0,0,1);
    spc.write_port(0,1,((inst+1)<<4)|note);
    std::vector<short> pcm(64000*2); // two seconds, stereo, 32 kHz
    if (auto e=spc.play(pcm.size(),pcm.data())) {std::cerr<<e;return 8;}
    std::ofstream out(argv[4],std::ios::binary);out.write((char*)pcm.data(),pcm.size()*2);
    int peak=0;for(auto v:pcm)peak=std::max(peak,std::abs((int)v));
    std::cout<<"instrument="<<inst<<" staff="<<note<<" peak="<<peak<<" mode="<<(int)r[4]
             <<" sample="<<(int)r[0x046a]<<" nspc="<<(int)r[0x046d]<<" fine="<<(int)r[0x046e]<<"\n";
    return peak?0:9;
}
