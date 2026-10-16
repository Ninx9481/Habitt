# Habit Grid Tracker

เว็บแอพติดตามนิสัยสไตล์ minimalist พร้อม heatmap แบบ GitHub
React (Vite) + Tailwind CSS v4 + Lucide Icons · เก็บข้อมูลใน LocalStorage และซิงค์ข้ามเครื่องผ่าน Google Sheet (Apps Script) แบบไม่บังคับ

## ฟีเจอร์

- Light / Dark ตามระบบ (`prefers-color-scheme`) + ปุ่มสลับ System / Light / Dark มุมขวาบน จำค่าที่เลือกไว้ และไม่กระพริบตอนเปิดหน้า
- การ์ดต่อ 1 habit: ชื่อ + สี, current streak, ปุ่ม **Check in today** ตัวใหญ่, heatmap 12 สัปดาห์ / 26 สัปดาห์ / 1 ปี (ตั้งได้ใน Settings)
- Heatmap: ช่องที่ไม่ได้ทำเป็นสีเทา ช่องที่ทำแล้วเป็นสีของ habit, hover หรือแตะเพื่อดูวันที่และสถานะ (Completed / Not completed)
  แตะช่องย้อนหลังแล้วกด **Mark as done / Undo** เพื่อบันทึกย้อนหลังวันที่ลืมได้
- เพิ่ม / แก้ไข (ชื่อ, สี) / ลบ habit (ลบแบบยืนยัน 2 ขั้น)
- Export / Import JSON (Import คือ "merge" ไม่ลบข้อมูลที่มีอยู่)
- ซิงค์ผ่าน Google Sheet: บันทึกในเครื่องก่อนเสมอ แล้วส่งขึ้นชีตเบื้องหลัง และดึงข้อมูลล่าสุดตอนเปิดแอพ / กลับมาที่แอพ

## เริ่มใช้งาน

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # ได้โฟลเดอร์ dist/
npm run preview    # ลองดู build จริง
```

เปิดดูบนมือถือในวง Wi-Fi เดียวกันระหว่างพัฒนา: `npm run dev -- --host`

## นำขึ้นออนไลน์ (เพื่อใช้บนมือถือ)

`dist/` เป็นไฟล์ static ล้วน อัปโหลดที่ไหนก็ได้ที่เป็น HTTPS เช่น Cloudflare Pages, Netlify, Vercel หรือ GitHub Pages
(ตั้ง `base: './'` ไว้แล้ว จึงใช้ใน sub-path ได้) จากนั้นบนมือถือกด "Add to Home Screen" ก็ใช้เหมือนแอพ

> ข้อมูล LocalStorage ผูกกับโดเมน ถ้าเปลี่ยนโดเมนข้อมูลในเครื่องจะเป็นชุดใหม่
> (แต่ถ้าเชื่อม Google Sheet ไว้ แค่ใส่ setup code ข้อมูลก็กลับมา)

## ตั้งค่า Google Sheet sync

1. สร้าง Google Sheet ใหม่ (ตั้งชื่ออะไรก็ได้)
2. เมนู **Extensions → Apps Script** ลบโค้ดเดิมทิ้ง แล้ววางเนื้อหาไฟล์ `apps-script/Code.gs`
3. แก้ค่า `TOKEN` บนสุดของไฟล์เป็นสตริงสุ่มยาว ๆ (30+ ตัวอักษร) และจดไว้ อย่าใช้รหัสผ่านที่ใช้ที่อื่น
4. เลือกฟังก์ชัน `setup` แล้วกด **Run** เพื่ออนุญาตสิทธิ์ (Google จะเตือนว่าเป็นแอพที่ยังไม่ verify
   ให้กด Advanced → Go to ... เพราะเป็นสคริปต์ของคุณเอง) ขั้นนี้จะสร้างแท็บ `habits` และ `checkins` ให้
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - กด Deploy แล้วคัดลอก Web app URL (ลงท้าย `/exec`)
6. เปิดแอพ → ไอคอนฟันเฟือง (Settings) → วาง URL และ Token → **Connect**
7. เครื่องที่สอง: ที่เครื่องแรกกด **Copy setup code** แล้วไปวางในช่อง "paste a setup code" ของอีกเครื่อง → **Apply**

ถ้าแก้ `Code.gs` ภายหลัง ต้อง **Deploy → Manage deployments → Edit → Version: New version → Deploy** ไม่เช่นนั้น URL เดิมยังรันโค้ดเก่า

### ซิงค์ทำงานอย่างไร

- ทุก record (habit และการ check-in รายวัน) มีเวลาแก้ไขล่าสุดของตัวเอง ถ้าแก้ record เดียวกันบนสองเครื่อง **อันที่แก้ทีหลังชนะ** เป็นรายแถว
  การติ๊กคนละวัน/คนละ habit จะไม่ทับกัน
- เครื่องจะส่งเฉพาะ record ที่เปลี่ยนตั้งแต่ซิงค์ครั้งก่อน และได้ข้อมูลทั้งหมดกลับมา merge
- ลบ habit เป็นการ "ทำเครื่องหมายว่าลบ" (`deleted = TRUE`) เพื่อให้เครื่องอื่นลบตามด้วย แถวจึงยังอยู่ในชีต
- ซิงค์อัตโนมัติ: ตอนเปิดแอพ, ตอนกลับมาที่แท็บ/แอพ, หลังแก้ข้อมูลประมาณ 0.7 วินาที และกดไอคอนเมฆมุมขวาบนเพื่อซิงค์ทันที
- ให้นาฬิกาของทั้งสองเครื่องตั้งเวลาอัตโนมัติไว้ (ใช้เวลาของเครื่องตัดสินว่าใครแก้ทีหลัง)
- อย่าแก้ข้อมูลในชีตด้วยมือ ให้แก้ในแอพ และอย่าเปลี่ยนชื่อแท็บหรือแถวหัวตาราง

### เรื่องความปลอดภัย

Web app ตั้งเป็น "Anyone" เพราะเว็บเรียกจากเบราว์เซอร์โดยไม่ล็อกอิน Google ตัวกันคือ **Token** ที่ตรวจฝั่งสคริปต์
(เก็บใน LocalStorage ของเบราว์เซอร์ และส่งผ่าน HTTPS ไปยัง `script.google.com` เท่านั้น แอพไม่ยอมส่งไปโดเมนอื่น)
เหมาะกับข้อมูล habit ส่วนตัว ไม่ควรใช้เก็บข้อมูลละเอียดอ่อน ถ้า Token รั่วให้เปลี่ยนค่าใน `Code.gs`, deploy version ใหม่ และ Connect ใหม่

## โครงสร้างไฟล์

```
habit-grid/
├─ index.html                 # ตั้งธีมก่อน render แรก (กัน flash)
├─ vite.config.js
├─ apps-script/Code.gs        # วางใน Google Apps Script
├─ public/                    # favicon, manifest (Add to Home Screen)
└─ src/
   ├─ main.jsx, App.jsx, index.css
   ├─ components/
   │  ├─ HabitCard.jsx        # การ์ด, streak, ปุ่ม check-in
   │  ├─ Heatmap.jsx          # grid แบบ GitHub + tooltip
   │  ├─ HabitModal.jsx       # เพิ่ม / แก้ไข / ลบ
   │  ├─ SettingsModal.jsx    # ช่วงสัปดาห์, sync, export/import
   │  ├─ ThemeToggle.jsx, Modal.jsx, ui.js
   ├─ hooks/
   │  ├─ useStore.js          # state + บันทึก LocalStorage + sync
   │  ├─ useTheme.js          # system / light / dark
   │  └─ useToday.js          # อัปเดต "วันนี้" ถ้าเปิดแอพค้างข้ามเที่ยงคืน
   └─ lib/
      ├─ dates.js             # วันที่ท้องถิ่น, สร้างกริดสัปดาห์, format
      ├─ habits.js            # โมเดลข้อมูล, streak, merge, validate
      ├─ storage.js           # LocalStorage (เปลี่ยนที่เก็บข้อมูลที่ไฟล์นี้ไฟล์เดียว)
      ├─ sync.js              # คุยกับ Apps Script
      └─ colors.js            # พาเลตสี (เพิ่มสีใหม่ที่นี่)
```

## โมเดลข้อมูล (เวอร์ชัน 2)

```json
{
  "version": 2,
  "habits": [
    { "id": "…", "name": "Read", "color": "emerald", "createdAt": 1760000000000, "updatedAt": 1760000000000, "deleted": false }
  ],
  "checkins": {
    "<habitId>|2026-10-17": { "done": true, "t": 1760000000000 }
  }
}
```

เก็บเฉพาะวันที่เคยกด (วันที่ไม่ได้ทำไม่ต้องเก็บ) และวันที่ทั้งหมดเป็น **วันตามเวลาท้องถิ่น** `YYYY-MM-DD`
ไม่ผ่าน `toISOString()` จึงไม่เพี้ยนเป็นวันก่อนหน้าเมื่อ check-in ช่วงเช้าตรู่ในโซนเวลา UTC+7

Streak นับย้อนจากวันนี้ ถ้ายังไม่ได้ check-in วันนี้ จะนับจากเมื่อวานต่อ (streak ไม่ขาดจนกว่าวันนี้จะจบ)
