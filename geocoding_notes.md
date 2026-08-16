# ملاحظات استخراج الدولة والمحافظة

تمت مراجعة سياسة Nominatim الرسمية وتوثيق reverse geocoding.

- Nominatim reverse geocoding يحول latitude/longitude إلى عنوان، ويمكن طلب address details.
- سياسة الخدمة العامة تحد الاستخدام بحد أقصى طلب واحد في الثانية لكل تطبيق، وتطلب User-Agent أو Referer واضحًا، ونسبة البيانات إلى OpenStreetMap.
- يجب استخدام caching/proxy إن أمكن، وعدم تنفيذ طلبات دورية أو bulk متكرر.
- لذلك سيُنفذ استخراج الدولة والمحافظة عند إرسال مصدر جديد فقط، مع حفظ النتيجة في قاعدة البيانات، وليس عند كل تحميل للوحة أو الخريطة.
- إذا زاد الاستخدام، يجب نقل التكامل إلى مزود مخصص أو خدمة reverse geocoding خاصة قابلة للتحكم.

المصادر:
- https://operations.osmfoundation.org/policies/nominatim/
- https://nominatim.org/release-docs/3.6/api/Reverse/
