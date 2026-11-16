import sys, subprocess, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'python'))
import imageio_ffmpeg
from PIL import Image, ImageDraw
root=Path(__file__).parent
ff=imageio_ffmpeg.get_ffmpeg_exe()
for n,name in enumerate(['InShot_20261109_214452341.mp4','InShot_20261109_214304194.mp4','InShot_20261109_214644838(1).mp4'],1):
    src=Path('C:/Users/USER/Downloads')/name
    info=subprocess.run([ff,'-i',str(src)],capture_output=True,text=True).stderr
    h,m,s=map(float,re.search(r'Duration: (\d+):(\d+):([\d.]+)',info).groups())
    duration=h*3600+m*60+s
    print(name,duration)
    sheet=Image.new('RGB',(1280,3*390),'#17212b')
    draw=ImageDraw.Draw(sheet)
    for k in range(6):
        t=duration*(k+.4)/6
        out=root/f'video{n}-{k}.jpg'
        subprocess.run([ff,'-loglevel','error','-ss',str(t),'-i',str(src),'-frames:v','1','-vf','scale=640:360:force_original_aspect_ratio=decrease','-y',str(out)],check=True)
        im=Image.open(out); x=(k%2)*640; y=(k//2)*390
        sheet.paste(im,(x+(640-im.width)//2,y+25))
        draw.text((x+12,y+5),f'Video {n} / {t:.1f}s',fill='white')
    sheet.save(root/f'video{n}-contact.jpg')
