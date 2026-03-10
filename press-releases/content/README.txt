নতুন প্রেস রিলিজ যোগ করার নিয়ম (মাত্র ৩টি ধাপ!)
=======================================================

ধাপ ১ — js/data.js খুলুন, pressReleases array তে যোগ করুন:
{
  id: 9,
  slug: "press-release-9",
  title: "আপনার শিরোনাম বাংলায়",
  date: "2025-09-01",
  img: "/img/press-release-9.jpg",
  summary: "প্রেস রিলিজের সংক্ষিপ্ত সারসংক্ষেপ।"
}

ধাপ ২ — এই content/ ফোল্ডারে press-release-9.txt ফাইল তৈরি করুন।
         লেখার নিয়ম:
         - সাধারণ paragraph: শুধু লিখুন, blank line দিয়ে আলাদা করুন
         - শিরোনাম: ## এই লাইন হেডিং হবে
         - মূল শিরোনাম: # এই লাইন বড় হেডিং হবে
         - বোল্ড: **এই লেখা বোল্ড হবে**
         - বুলেট: - এইভাবে বুলেট লিস্ট

ধাপ ৩ — press-releases/ ফোল্ডারে press-release-9.html তৈরি করুন:
         template.html কপি করে press-release-9.html নামে save করুন।

ব্যস! বাকি সব automatic — title, image, date, content, share buttons সব নিজে লোড হবে।

টিপস:
- img ফাইল /img/ ফোল্ডারে রাখুন
- date format: YYYY-MM-DD (যেমন: 2025-09-01)
- slug এবং html filename একই হতে হবে
