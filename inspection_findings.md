# نتائج الفحص الأولي لمشروع 3tshan

تاريخ الفحص: 2026-08-16.

## المستودع

المستودع عام على GitHub، فرع main، ويحتوي على 66 commit وفق صفحة GitHub وقت الفحص. الملفات الأساسية: `index.html`، `script.js`، `styles.css`، `api/water-sources.js`، `package.json`، ومجلد `images`.

## النسخة المنشورة

الرابط المنشور هو https://3tshan.vercel.app. الواجهة تُحمّل وتعرض واجهة عربية RTL وخريطة Leaflet وأزرار التنقل والنماذج.

## مشكلة تشغيل مؤكدة

طلب GET إلى `https://3tshan.vercel.app/api/water-sources` يعيد صفحة Vercel بحالة 500، بالرمز `FUNCTION_INVOCATION_FAILED`. لذلك لا تُحمّل مصادر المياه في الواجهة، وتظهر الخريطة بدون بيانات المصادر.

## ملاحظات من الكود

`package.json` يعرّف الاعتماد `@neondatabase/serverless` فقط، وملف `api/water-sources.js` يستورد `neon` بصورة صحيحة ويستعمل `neon(process.env.DATABASE_URL)`. سبب 500 ليس خطأ صياغة في الملف؛ يلزم التحقق من `DATABASE_URL` في Vercel، اتصال Neon، وبنية جدول `water_sources` وسجلات الدالة.

الواجهة تعتمد على Leaflet وGoogle tile URLs مباشرة من CDN، وتستخدم JavaScript خامًا مع تنقل داخلي بين ثلاث views. حساب المستخدم والإحصائيات في HTML ثابتة وليست مرتبطة بمستخدم أو قاعدة بيانات.

واجهة POST تتحقق من النوع وحالة الحرارة والسعر والإحداثيات على الخادم، لكنها لا تتحقق من نطاق الإحداثيات أو طول/صيغة النصوص، وتعيد `error.message` في استجابات 500. إعداد CORS يسمح لأي origin.

يوجد input للصورة في الواجهة، لكن الإرسال يضع `photo_url: null` ولا يرفع الملف فعليًا.
