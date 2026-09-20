const menuBtn = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.nav-links');

menuBtn?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});

document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

const featureData = {
  dashboard: {
    title: 'Dashboard & Revenue',
    text: 'เห็นภาพรวมของคลินิกในหน้าเดียว พร้อมสรุปรายรับรายวัน รายเดือน รายช่วงเวลา และดูหัตถการที่ได้รับความสนใจ'
  },
  patient: {
    title: 'Patient & OPD',
    text: 'จัดเก็บข้อมูลคนไข้และประวัติการรักษา พร้อม OPD สำหรับงานปรึกษาศัลยกรรม/ความงาม และประวัติภาพก่อน–หลัง'
  },
  line: {
    title: 'LINE OA Integration',
    text: 'เชื่อมการสื่อสารกับคนไข้ ช่วยให้ทีมไม่พลาดข้อความ แจ้งเตือนนัดหมาย และสื่อสารข่าวสารของคลินิกได้เป็นระบบ'
  },
  meds: {
    title: 'Medication Control',
    text: 'จัดการการจ่ายยาและตรวจสอบประวัติการดำเนินการ ช่วยให้ workflow ด้านยาเป็นระบบและตรวจสอบย้อนหลังได้'
  },
  docs: {
    title: 'Documents & Permissions',
    text: 'จัดการเอกสารและกำหนดสิทธิ์ของทีมงาน เช่น การแก้ไขบิล สต็อกยา หรือการลบไฟล์ ตามบทบาทที่กำหนด'
  }
};

const tabs = document.querySelectorAll('.feature-tab');
const panelTitle = document.querySelector('#panelTitle');
const panelText = document.querySelector('#panelText');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const data = featureData[tab.dataset.feature];
    panelTitle.textContent = data.title;
    panelText.textContent = data.text;
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {threshold: 0.12});

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
document.querySelector('#year').textContent = new Date().getFullYear();
