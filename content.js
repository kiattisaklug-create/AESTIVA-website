/* =====================================================================
   content.js — ข้อมูลของเว็บไซต์ AESTIVA
   ไฟล์นี้ถูกจัดการโดยโปรแกรม AESTIVA Admin (แก้ผ่านโปรแกรมได้เลย ไม่ต้องเปิดไฟล์นี้)
   ถ้าจะแก้ด้วยมือ: แก้เฉพาะข้อความในเครื่องหมายคำพูด "..." หรือตัวเลข
   และห้ามลบเครื่องหมาย , { } [ ]
   ===================================================================== */
window.AESTIVA_CONTENT = {
  "contact": {
    "lineId": "@392qlspn",
    "tiktok": "AESTIVA56",
    "instagram": "AESTIVA56",
    "phone": "",
    "email": "",
    "lineQrImage": "assets/line-qr.svg"
  },
  "plans": [
    {
      "name": "Lite",
      "price": 990,
      "period": "/เดือน",
      "tagline": "สำหรับคลินิกที่ต้องการวางระบบพื้นฐานให้เป็นระเบียบ",
      "features": [
        "Booking / Queue",
        "Medication Dispensing",
        "Documents",
        "Basic Receipts",
        "1 Staff Seat"
      ],
      "cta": "สนใจ Lite",
      "style": "plain",
      "badge": ""
    },
    {
      "name": "Pro",
      "price": 2490,
      "period": "/เดือน",
      "tagline": "สำหรับคลินิกที่ต้องการเชื่อมระบบงานกับการสื่อสาร",
      "features": [
        "ทุกอย่างใน Lite",
        "LINE Chat + Broadcast",
        "Portfolio / Rich Menu",
        "5 Staff Seats"
      ],
      "cta": "ขอ Demo Pro",
      "style": "featured",
      "badge": "ใช้มากที่สุด"
    },
    {
      "name": "Mastery",
      "price": 4990,
      "period": "/เดือน",
      "tagline": "สำหรับคลินิกที่ต้องการการควบคุมและการจัดการระดับองค์กร",
      "features": [
        "ทุกอย่างใน Pro",
        "Unlimited Staff",
        "Audit Log + Backup",
        "White-label Logo / Name"
      ],
      "cta": "สนใจ Mastery",
      "style": "dark",
      "badge": ""
    }
  ],
  "planNote": "ราคาและขอบเขต Module สามารถปรับตามรุ่นของระบบและเงื่อนไขการให้บริการ กรุณาติดต่อ AESTIVA เพื่อยืนยันรายละเอียดล่าสุด",
  "modules": [
    {
      "group": "พื้นฐาน",
      "name": "Clinic Operations",
      "items": "คิว • นัดหมาย • OPD • เอกสาร • คนไข้",
      "badge": "Essential",
      "icon": "clipboard",
      "version": ""
    },
    {
      "group": "การสื่อสาร",
      "name": "LINE OA",
      "items": "ข้อความ • แจ้งเตือน • Reminder • Broadcast",
      "badge": "Connect",
      "icon": "chat",
      "version": ""
    },
    {
      "group": "การควบคุม",
      "name": "Staff & Audit",
      "items": "Permission • Log • Backup • Control",
      "badge": "Secure",
      "icon": "shield",
      "version": ""
    },
    {
      "group": "ภาพรวมธุรกิจ",
      "name": "Business Dashboard",
      "items": "รายรับ • หัตถการ • ภาพรวมธุรกิจ",
      "badge": "Insight",
      "icon": "chart",
      "version": ""
    }
  ],
  "latestVersion": "V1",
  "updates": [
    {
      "version": "V1",
      "title": "Clinic Management Foundation",
      "text": "โครงสร้างหลักสำหรับผู้ป่วย นัดหมาย เอกสาร การจ่ายยา และการจัดการงานภายในคลินิก",
      "status": "released",
      "date": ""
    },
    {
      "version": "Next",
      "title": "Module Expansion",
      "text": "เพิ่มความสามารถด้าน LINE OA, Dashboard, Permission และ workflow ที่ตอบโจทย์การทำงานจริง",
      "status": "now",
      "date": ""
    },
    {
      "version": "Roadmap",
      "title": "More Modules • More Integrations",
      "text": "พื้นที่สำหรับประกาศความสามารถใหม่และการอัปเกรดในอนาคต",
      "status": "soon",
      "date": ""
    }
  ],
  "clinics": [
    {
      "name": "",
      "note": "",
      "logo": ""
    }
  ],
  "faq": [
    {
      "q": "AESTIVA เหมาะกับคลินิกแบบไหน?",
      "a": "ออกแบบสำหรับคลินิกศัลยกรรมและความงาม ตั้งแต่คลินิกที่ต้องการวางระบบพื้นฐานให้เป็นระเบียบ ไปจนถึงคลินิกที่มีทีมงานหลายตำแหน่งและต้องการควบคุมสิทธิ์ พร้อมตรวจสอบข้อมูลย้อนหลังได้"
    },
    {
      "q": "เริ่มใช้เฉพาะบางส่วนก่อนได้หรือไม่?",
      "a": "ได้ AESTIVA เป็นระบบแบบ Modular เริ่มจากส่วนที่จำเป็น เช่น นัดหมาย OPD และเอกสาร แล้วค่อยเพิ่ม LINE OA, Staff & Audit หรือ Dashboard เมื่อคลินิกพร้อม"
    },
    {
      "q": "ปรับให้เข้ากับวิธีทำงานของคลินิกได้ไหม?",
      "a": "ได้ AESTIVA ออกแบบเป็น workflow แบบกึ่งอัตโนมัติ ช่วยให้ทีมทำงานเร็วขึ้น แต่ยังตรวจสอบ แก้ไข และตัดสินใจเองได้ตามสถานการณ์จริงของแต่ละคลินิก"
    },
    {
      "q": "ราคาและขอบเขตของแต่ละแพ็กเกจยืนยันอย่างไร?",
      "a": "ราคาที่แสดงเป็นโครงสร้างเริ่มต้น ขอบเขต Module อาจปรับตามรุ่นของระบบและเงื่อนไขการให้บริการ ติดต่อทีม AESTIVA ทาง LINE OA เพื่อยืนยันรายละเอียดล่าสุด"
    },
    {
      "q": "ขอดู Demo ได้อย่างไร?",
      "a": "ทักมาทาง LINE OA แล้วบอกว่าสนใจดู Demo ทีม AESTIVA จะพูดคุยและนัดดูระบบจริงร่วมกับคุณ"
    }
  ],
  "screenshots": [
    {
      "id": "smuc3f7gx7ur",
      "image": "assets/shots/shot-20260922-100702-adf2-dashboard.webp",
      "title": "DASHBOARD",
      "caption": "หน้าจอหลักของitระบบ",
      "alt": "",
      "size": "large",
      "frame": true,
      "hidden": false,
      "w": 1476,
      "h": 613
    }
  ],
  "buildId": "20260923-082839-d7c1"
};
