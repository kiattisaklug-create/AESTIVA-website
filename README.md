# AESTIVA Website Starter

เว็บไซต์ Landing / Product Website สำหรับ AESTIVA — Aesthetic Clinic Management System

## โครงสร้าง

- `index.html` — หน้าเว็บไซต์ทั้งหมด
- `styles.css` — Theme / Responsive / Animation
- `script.js` — Mobile menu, feature tabs, scroll reveal
- `server.js` — Static server สำหรับ Railway
- `package.json` — Start command สำหรับ Railway
- `assets/aestiva-logo.png` — Logo ที่ส่งมา
- `assets/brand-reference.png` — ภาพ reference / color palette ที่ส่งมา

## Theme

โทนหลัก:
- Gold / Metallic Gold
- Deep Gold
- Ivory / Pearl White
- Champagne / Cream
- Dark Brown

เว็บไซต์นี้ใช้เอฟเฟกต์แบบพอดี: glass navigation, glow, orbit, hover, scroll reveal และ feature tabs โดยหลีกเลี่ยง animation ที่รบกวนการอ่าน

## ก่อนเปิดจริงควรแก้

1. ใส่ URL จริงของ LINE OA ถ้าต้องการใช้ลิงก์เฉพาะของบัญชี
2. เพิ่ม screenshots ของ Software จริงใน section Features
3. เพิ่มชื่อ/Logo คลินิกที่อนุญาตให้เผยแพร่
4. เพิ่ม Privacy Policy / Terms ถ้ามีการเก็บข้อมูลผ่านเว็บไซต์
5. ตรวจราคาและขอบเขต Module ให้ตรงกับสัญญาหรือแพ็กเกจปัจจุบัน
6. เพิ่ม Google Analytics / Search Console หลังเลือกโดเมนจริง

## Run บนเครื่อง

ต้องมี Node.js 20+

```bash
npm start
```

จากนั้นเปิด:
`http://localhost:3000`

## GitHub

สร้าง repository ใหม่ เช่น `aestiva-website`

```bash
git init
git add .
git commit -m "Initial AESTIVA website"
git branch -M main
git remote add origin https://github.com/kiattisaklug-create/aestiva-website.git
git push -u origin main
```

ถ้า repository มีอยู่แล้ว ให้ใช้ `git remote -v` ตรวจ remote ก่อน

## Railway

1. Railway Dashboard → New Project
2. Deploy from GitHub Repo
3. เลือก `aestiva-website`
4. Deploy
5. Settings → Networking → Generate Domain
6. ถ้ามีโดเมน เช่น `aestiva.co.th` ให้เพิ่ม Custom Domain และตั้ง DNS ตามค่าที่ Railway แสดง

เมื่อ push commit ใหม่ไปยัง branch ที่เชื่อมไว้ Railway สามารถ build/deploy ใหม่โดยอัตโนมัติ

## สำคัญเรื่องความปลอดภัย

อย่าใส่ API keys, passwords, database credentials หรือ secrets ลงใน GitHub
ให้เก็บ secrets ใน Railway Variables แทน
