import os, urllib.request, sys

out = open(r'C:\Users\paolo.giorsetti\Desktop\RondaManager\_results.txt', 'w', encoding='utf-8')

# 1. APK Flutter
path1 = r'C:\Users\paolo.giorsetti\Desktop\RondaManager\mobile\build\app\outputs\flutter-apk\app-release.apk'
if os.path.exists(path1):
    size1 = os.path.getsize(path1)
    out.write(f"[1] app-release.apk: ESISTE - {size1:,} bytes ({size1/1024/1024:.2f} MB)\n")
else:
    out.write("[1] app-release.apk: NON ESISTE\n")

# 2. APK web/public
path2 = r'C:\Users\paolo.giorsetti\Desktop\RondaManager\web\public\rondamanager.apk'
if os.path.exists(path2):
    size2 = os.path.getsize(path2)
    out.write(f"[2] rondamanager.apk: ESISTE - {size2:,} bytes ({size2/1024/1024:.2f} MB)\n")
else:
    out.write("[2] rondamanager.apk: NON ESISTE\n")

# 3. Richiesta HEAD a Vercel
try:
    req = urllib.request.Request('https://web-one-opal-87.vercel.app/rondamanager.apk', method='HEAD')
    with urllib.request.urlopen(req, timeout=10) as res:
        length = res.headers.get('Content-Length')
        out.write(f"[3] Vercel: STATUS {res.status} {res.reason}\n")
        if length:
            out.write(f"[3] Vercel: CONTENT-LENGTH = {int(length):,} bytes ({int(length)/1024/1024:.2f} MB)\n")
        else:
            out.write("[3] Vercel: CONTENT-LENGTH non specificato\n")
except Exception as e:
    out.write(f"[3] Vercel: ERRORE - {e}\n")

out.close()
print("DONE", flush=True)
