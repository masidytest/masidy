'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Locale = 'en' | 'ar'

const localeStorageKey = 'masidy-locale'

const arabicTranslations: Record<string, string> = {
  'Acceptable Use': 'الاستخدام المقبول',
  'Add project': 'إضافة مشروع',
  'All projects': 'كل المشاريع',
  'Collapse sidebar': 'طيّ الشريط الجانبي',
  'Browse all': 'تصفّح الكل',
  'Browse templates': 'تصفّح القوالب',
  Cancel: 'إلغاء',
  Chats: 'المحادثات',
  'Could not load chats': 'تعذّر تحميل المحادثات',
  'Could not load projects': 'تعذّر تحميل المشاريع',
  'Create a project': 'إنشاء مشروع',
  'Set up a workspace for related chats and consistent generation instructions.':
    'أنشئ مساحة عمل للمحادثات المرتبطة وتعليمات الإنشاء المتسقة.',
  Name: 'الاسم',
  'e.g. Marketing website': 'مثال: موقع تسويقي',
  'What belongs in this project?': 'ما الذي يتضمنه هذا المشروع؟',
  'Shared requirements, tech choices, and visual direction':
    'المتطلبات المشتركة والخيارات التقنية والتوجه البصري',
  'Filter projects': 'تصفية المشاريع',
  'Private projects': 'مشاريع خاصة',
  'Team projects': 'مشاريع الفريق',
  'Any time': 'أي وقت',
  'Past 7 days': 'آخر ٧ أيام',
  'Past 30 days': 'آخر ٣٠ يومًا',
  'More than 30 days ago': 'منذ أكثر من ٣٠ يومًا',
  'You reached your project limit.': 'لقد وصلت إلى الحد الأقصى للمشاريع.',
  'Least recently updated': 'الأقدم تحديثًا',
  'project': 'مشروع',
  'projects': 'مشاريع',
  'Retry': 'إعادة المحاولة',
  'Try a different project name or clear your search.':
    'جرّب اسم مشروع آخر أو امسح البحث.',
  'Projects keep your chats and generation instructions organized in one workspace.':
    'تنظّم المشاريع محادثاتك وتعليمات الإنشاء في مساحة عمل واحدة.',
  'Private': 'خاص',
  'Team': 'الفريق',
  'Updated': 'تم التحديث',
  'Create project': 'إنشاء مشروع',
  'Project created': 'تم إنشاء المشروع',
  'Could not create project': 'تعذّر إنشاء المشروع',
  'Please try again.': 'يرجى المحاولة مرة أخرى.',
  'Recent chats': 'المحادثات الأخيرة',
  'Search chat names and prompts': 'ابحث في أسماء المحادثات ومطالباتها',
  'Oldest updated': 'الأقدم تحديثًا',
  'Search templates...': 'ابحث في القوالب...',
  'Template categories': 'فئات القوالب',
  'Search design systems': 'ابحث في أنظمة التصميم',
  'New design system': 'نظام تصميم جديد',
  'e.g. Masidy brand': 'مثال: علامة مسدي التجارية',
  'A short note about this design system':
    'ملاحظة قصيرة عن نظام التصميم هذا',
  'Describe colors, typography, spacing, components, and constraints':
    'صِف الألوان والخطوط والمسافات والمكونات والقيود',
  'No matching templates': 'لا توجد قوالب مطابقة',
  'No matching design systems': 'لا توجد أنظمة تصميم مطابقة',
  'Search projects': 'ابحث في المشاريع',
  'Search chats by title or prompt': 'ابحث في المحادثات بالعنوان أو المطالبة',
  'Search your chats…': 'ابحث في محادثاتك…',
  'Main navigation': 'التنقل الرئيسي',
  'New chat options': 'خيارات المحادثة الجديدة',
  "Masidy's projects": 'مشاريع مسدي',
  'Expand sidebar': 'توسيع الشريط الجانبي',
  'Create a new project': 'إنشاء مشروع جديد',
  'Choose a model': 'اختر نموذجًا',
  'Default model': 'النموذج الافتراضي',
  'No project': 'لا يوجد مشروع',
  'Latest projects': 'أحدث المشاريع',
  'All': 'الكل',
  'Art & Design': 'الفن والتصميم',
  'Business': 'الأعمال',
  'Education': 'التعليم',
  'Entertainment': 'الترفيه',
  'Games': 'الألعاب',
  'Productivity': 'الإنتاجية',
  'Social': 'التواصل الاجتماعي',
  'Utilities': 'الأدوات',
  'Add to project': 'إضافة إلى المشروع',
  'No recent chats': 'لا توجد محادثات حديثة',
  'No project selected': 'لم يتم اختيار مشروع',
  'Start building': 'ابدأ الإنشاء',
  'See all': 'عرض الكل',
  'Popular templates': 'القوالب الشائعة',
  'Frequently asked questions': 'الأسئلة الشائعة',
  'Clear search and filters': 'مسح البحث وعوامل التصفية',
  'Failed to load projects.': 'فشل تحميل المشاريع.',
  'All time': 'كل الأوقات',
  'Project limit': 'حد المشاريع',
  'Search chats': 'البحث في المحادثات',
  'New Chat': 'محادثة جديدة',
  'Start a new chat': 'ابدأ محادثة جديدة',
  'No chats found': 'لم يتم العثور على محادثات',
  'No chats yet': 'لا توجد محادثات بعد',
  'Filter chats': 'تصفية المحادثات',
  'Recently updated': 'الأحدث تحديثًا',
  'Loading chats…': 'جارٍ تحميل المحادثات…',
  'Could not load chats.': 'تعذّر تحميل المحادثات.',
  'Show more': 'عرض المزيد',
  'Show less': 'عرض أقل',
  'No templates found': 'لم يتم العثور على قوالب',
  'No custom design systems yet': 'لا توجد أنظمة تصميم مخصصة بعد',
  'Add design system': 'إضافة نظام تصميم',
  'Save design system': 'حفظ نظام التصميم',
  'Delete design system': 'حذف نظام التصميم',
  'Save': 'حفظ',
  'Create': 'إنشاء',
  'Delete': 'حذف',
  'Edit': 'تعديل',
  'Loading': 'جارٍ التحميل',
  'Error': 'خطأ',
  'Something went wrong': 'حدث خطأ ما',
  'Try again': 'حاول مرة أخرى',
  'No results': 'لا توجد نتائج',
  'Search': 'بحث',
  'Filter': 'تصفية',
  'Sort': 'ترتيب',
  'Updated recently': 'تم تحديثه مؤخرًا',
  'Open menu': 'فتح القائمة',
  'Close menu': 'إغلاق القائمة',
  'Your Chats': 'محادثاتك',
  'Workspace navigation': 'قائمة مساحة العمل',
  'Select project workspace': 'اختيار مساحة عمل المشروع',
  'Sign in': 'تسجيل الدخول',
  'English': 'الإنجليزية',
  'Arabic': 'العربية',
  'Language': 'اللغة',
  'Choose a complete MIT-licensed project. Select a template to prefill the builder, then submit your request to start from its real source code.':
    'اختر مشروعًا كاملًا بترخيص MIT. حدّد قالبًا لتعبئة المنشئ، ثم أرسل طلبك للبدء من الشيفرة المصدرية الفعلية.',
  'Choose a visual direction for the next generation, or save your own reusable design instructions.':
    'اختر نمطًا بصريًا للإنشاء التالي، أو احفظ تعليمات تصميم قابلة لإعادة الاستخدام.',
  'Contact form': 'نموذج تواصل',
  Cookies: 'ملفات تعريف الارتباط',
  'Create Account': 'إنشاء حساب',
  'Create your first project': 'أنشئ مشروعك الأول',
  Dashboard: 'لوحة التحكم',
  'Design Systems': 'أنظمة التصميم',
  'Design systems': 'أنظمة التصميم',
  'Describe an idea and watch it become a working app.':
    'صف فكرتك وشاهدها تتحول إلى تطبيق يعمل.',
  'Describe what you want to build...': 'صِف ما تريد إنشاءه...',
  'E-commerce': 'التجارة الإلكترونية',
  'Environment variables': 'متغيرات البيئة',
  FAQ: 'الأسئلة الشائعة',
  Favorites: 'المفضلة',
  Feedback: 'إرسال ملاحظات',
  Filters: 'عوامل التصفية',
  'Home': 'الرئيسية',
  'Give feedback': 'إرسال ملاحظات',
  'Image editor': 'محرر الصور',
  'Keep chats, project instructions, and builds together.':
    'اجمع المحادثات وتعليمات المشروع وعمليات البناء في مكان واحد.',
  'Landing Pages': 'صفحات الهبوط',
  'Loading projects…': 'جارٍ تحميل المشاريع…',
  'Log in': 'تسجيل الدخول',
  'Log out': 'تسجيل الخروج',
  'Manage projects': 'إدارة المشاريع',
  'Mini game': 'لعبة مصغّرة',
  'Name A–Z': 'الاسم من أ إلى ي',
  'New project': 'مشروع جديد',
  'No drafts yet': 'لا توجد مسودات بعد',
  'No matching projects': 'لا توجد مشاريع مطابقة',
  'No projects yet': 'لا توجد مشاريع بعد',
  'No preview available': 'لا تتوفر معاينة',
  'Open project workspace': 'فتح مساحة عمل المشروع',
  'Open account menu': 'فتح قائمة الحساب',
  'Mobile navigation': 'قائمة التنقل للهاتف',
  More: 'المزيد',
  'Open workspace navigation': 'فتح قائمة مساحة العمل',
  'Press ⌘↵ or Ctrl+Enter to send': 'اضغط ⌘↵ أو Ctrl+Enter للإرسال',
  Preview: 'معاينة',
  Privacy: 'الخصوصية',
  Projects: 'المشاريع',
  'Project settings': 'إعدادات المشروع',
  'Project workspace': 'مساحة عمل المشروع',
  'Recently updated chats': 'المحادثات الأحدث تحديثًا',
  'Save changes': 'حفظ التغييرات',
  'Search chats...': 'ابحث في المحادثات...',
  'Select project': 'اختر مشروعًا',
  'Sign out': 'تسجيل الخروج',
  'Sign up': 'إنشاء حساب',
  'Sort projects': 'ترتيب المشاريع',
  'Start with a template': 'ابدأ باستخدام قالب',
  'The Masidy template gallery': 'معرض قوالب مسدي',
  Templates: 'القوالب',
  Terms: 'الشروط',
  Theme: 'المظهر',
  'Tell us what you think…': 'أخبرنا برأيك…',
  'Your feedback': 'ملاحظاتك',
  Submit: 'إرسال',
  Usage: 'الاستخدام',
  Unavailable: 'غير متاح',
  'Loading…': 'جارٍ التحميل…',
  'Mobile menu': 'قائمة الهاتف',
  'Use in new chat': 'استخدم في محادثة جديدة',
  'Use system theme': 'استخدام مظهر النظام',
  'Use light theme': 'استخدام المظهر الفاتح',
  'Use dark theme': 'استخدام المظهر الداكن',
  'What do you want to create?': 'ما الذي تريد إنشاءه؟',
  Workspace: 'مساحة العمل',
  'Your chats will appear here.': 'ستظهر محادثاتك هنا.',
  'Your projects will appear here.': 'ستظهر مشاريعك هنا.',
  'View all': 'عرض الكل',
  'Use this template': 'استخدم هذا القالب',
  'No custom projects yet': 'لا توجد مشاريع مخصصة بعد',
  'Back to projects': 'العودة إلى المشاريع',
  'Share what went well or how we can improve Masidy. Submit opens a GitHub feedback draft for you to review.':
    'شاركنا ما أعجبك أو كيف يمكننا تحسين مسدي. سيؤدي الإرسال إلى فتح مسودة ملاحظات على GitHub لمراجعتها.',
  'What can I build?': 'ماذا يمكنني أن أبني؟',
  'Can I start from a template?': 'هل يمكنني البدء من قالب؟',
  Description: 'الوصف',
  'Generation instructions': 'تعليمات الإنشاء',
  'Narrow projects by visibility and when they were last updated.':
    'صفِّ المشاريع حسب إمكانية الوصول وموعد آخر تحديث.',
  'Project visibility': 'إمكانية الوصول إلى المشروع',
  'Last updated': 'آخر تحديث',
  'Show': 'عرض',
  'Categories': 'الفئات',
  template: 'قالب',
  templates: 'قوالب',
  system: 'نظام',
  systems: 'أنظمة',
  chat: 'محادثة',
  chats: 'محادثات',
  messages: 'رسائل',
  'Browse all templates': 'تصفّح جميع القوالب',
  'Change the search or select a different category.':
    'غيّر عبارة البحث أو اختر فئة أخرى.',
  Use: 'استخدم',
  'Complete source project': 'مشروع كامل مع الشيفرة المصدرية',
  Fast: 'سريع',
  Balanced: 'متوازن',
  Advanced: 'متقدم',
  'Create a project from the Projects page first.':
    'أنشئ مشروعًا أولًا من صفحة المشاريع.',
  'Design system': 'نظام التصميم',
  Design: 'التصميم',
  'Default design': 'التصميم الافتراضي',
  'Describe websites, dashboards, tools, and app ideas. Masidy creates a live preview and editable project files.':
    'صِف مواقع الويب ولوحات التحكم والأدوات وأفكار التطبيقات. ينشئ مسدي معاينة مباشرة وملفات مشروع قابلة للتحرير.',
  'Yes. Choose a starter above or browse the full template library, then customize the prompt before building.':
    'نعم. اختر قالبًا أعلاه أو تصفّح مكتبة القوالب كاملة، ثم خصّص الطلب قبل الإنشاء.',
  'Landing page navigation': 'تنقل الصفحة الرئيسية',
  'Masidy home': 'الصفحة الرئيسية لمسدي',
  Masidy: 'مسدي',
  'New': 'جديد',
  'Create a design system': 'إنشاء نظام تصميم',
  'Create a reusable visual and implementation guide for future chats in this browser.':
    'أنشئ دليلًا مرئيًا وتنفيذيًا قابلًا لإعادة الاستخدام للمحادثات القادمة في هذا المتصفح.',
  'Design and coding instructions': 'تعليمات التصميم والبرمجة',
  'Save system': 'حفظ النظام',
  'Custom design system': 'نظام تصميم مخصص',
  'Could not load saved design systems': 'تعذّر تحميل أنظمة التصميم المحفوظة',
  'Your browser storage may be unavailable or corrupted.':
    'قد تكون مساحة التخزين في المتصفح غير متاحة أو تالفة.',
  'Design system saved': 'تم حفظ نظام التصميم',
  'Ready to use in a new chat.': 'أصبح جاهزًا للاستخدام في محادثة جديدة.',
  'Could not save design system': 'تعذّر حفظ نظام التصميم',
  'Your browser storage may be unavailable.':
    'قد تكون مساحة التخزين في المتصفح غير متاحة.',
  'Save your project conventions and visual direction as a reusable profile.':
    'احفظ معايير مشروعك وتوجهه البصري كملف تعريف قابل لإعادة الاستخدام.',
  'Try another search.': 'جرّب بحثًا آخر.',
  'Presets guide Masidy generation through project instructions; they do not install external component packages.':
    'توجّه الإعدادات المسبقة إنشاء مسدي عبر تعليمات المشروع؛ ولا تثبّت حزم مكونات خارجية.',
  'Could not update favorite': 'تعذّر تحديث المفضلة',
  'Added to favorites': 'أُضيف إلى المفضلة',
  'Removed from favorites': 'أُزيل من المفضلة',
  'Failed to load chats': 'فشل تحميل المحادثات',
  'Error loading chats': 'خطأ أثناء تحميل المحادثات',
  'Get started by creating your first chat.':
    'ابدأ بإنشاء محادثتك الأولى.',
  'Sort chats': 'ترتيب المحادثات',
  'Clear filters': 'مسح عوامل التصفية',
  'Search templates': 'ابحث في القوالب',
  'Account type': 'نوع الحساب',
  'Generations today': 'عمليات الإنشاء اليوم',
  'Member since': 'عضو منذ',
  'Regular': 'عادي',
  Guest: 'ضيف',
  'Delete account': 'حذف الحساب',
  Profile: 'الملف الشخصي',
  Email: 'البريد الإلكتروني',
  'Browse All': 'تصفّح الكل',
  Settings: 'الإعدادات',
  'Close workspace navigation': 'إغلاق قائمة مساحة العمل',
  'Esc to close': 'اضغط Esc للإغلاق',
  'Password': 'كلمة المرور',
  'Signing in...': 'جارٍ تسجيل الدخول...',
  'Creating account...': 'جارٍ إنشاء الحساب...',
  'Sign In': 'تسجيل الدخول',
  'By creating an account, you agree to our': 'بإنشاء حساب، فإنك توافق على',
  'and acknowledge the': 'وتقرّ بـ',
  'Privacy Policy': 'سياسة الخصوصية',
  "Don't have an account?": 'ليس لديك حساب؟',
  'Already have an account?': 'لديك حساب بالفعل؟',
  'Total generations': 'إجمالي عمليات الإنشاء',
  'Recent Chats': 'المحادثات الأخيرة',
  'Danger Zone': 'منطقة الخطر',
  'Permanently delete your account and all associated data. This action cannot be undone.':
    'احذف حسابك وجميع البيانات المرتبطة به نهائيًا. لا يمكن التراجع عن هذا الإجراء.',
  'Delete Account': 'حذف الحساب',
  'Are you sure you want to permanently delete your account? All your chat history and data will be removed. This action cannot be undone.':
    'هل أنت متأكد من رغبتك في حذف حسابك نهائيًا؟ ستتم إزالة سجل محادثاتك وجميع بياناتك. لا يمكن التراجع عن هذا الإجراء.',
  'Deleting…': 'جارٍ الحذف…',
  'Yes, delete my account': 'نعم، احذف حسابي',
  'Deletion failed': 'فشل الحذف',
  'Could not delete your account. Please try again or contact support.':
    'تعذّر حذف حسابك. حاول مرة أخرى أو تواصل مع الدعم.',
  'Environment variable name': 'اسم متغير البيئة',
  'Environment variable value': 'قيمة متغير البيئة',
  'Secret value': 'قيمة سرية',
  'Custom domains': 'النطاقات المخصصة',
  'DNS verification records': 'سجلات التحقق من DNS',
  'Custom domain': 'نطاق مخصص',
  'Production deployments': 'عمليات النشر للإنتاج',
  'Choose a chat to add': 'اختر محادثة لإضافتها',
  'Add an existing chat…': 'إضافة محادثة موجودة…',
  'No chats in this project yet': 'لا توجد محادثات في هذا المشروع بعد',
  'Visual style, framework, conventions, and shared requirements':
    'النمط المرئي وإطار العمل والمعايير والمتطلبات المشتركة',
  'Change language': 'تغيير اللغة',
  'This policy describes the information Masidy processes when you use this AI app-building service.':
    'توضح هذه السياسة المعلومات التي تعالجها مسدي عند استخدام خدمة إنشاء التطبيقات بالذكاء الاصطناعي.',
  'Masidy uses essential browser storage to operate sign-in and remember your preferences.':
    'تستخدم مسدي مساحة تخزين أساسية في المتصفح لتسجيل الدخول وتذكر تفضيلاتك.',
  'Use Masidy responsibly and only with content and systems you are authorized to use.':
    'استخدم مسدي بمسؤولية، واقتصر على المحتوى والأنظمة المصرح لك باستخدامها.',
  'These terms apply when you access or use Masidy, an AI-powered app-building service.':
    'تسري هذه الشروط عند وصولك إلى مسدي أو استخدامها، وهي خدمة لإنشاء التطبيقات بالذكاء الاصطناعي.',
  'When you register, Masidy stores your email address, a password hash, and account creation time. Authentication also uses a session cookie to keep you signed in.':
    'عند التسجيل، تخزّن مسدي عنوان بريدك الإلكتروني وبصمة كلمة المرور ووقت إنشاء الحساب. كما يستخدم التحقق من الهوية ملف تعريف ارتباط للجلسة لإبقائك مسجلًا للدخول.',
  'When you create apps, your prompts, submitted attachments, generated chat content, and related chat or project identifiers are sent to and processed by the v0 Platform API. Masidy stores account-to-chat and account-to-project ownership records.':
    'عند إنشاء التطبيقات، تُرسل مطالباتك ومرفقاتك ومحتوى المحادثات المُنشأ ومعرّفات المحادثات أو المشاريع ذات الصلة إلى واجهة v0 Platform API لمعالجتها. وتخزّن مسدي سجلات ربط الحساب بالمحادثات والمشاريع.',
  'The application also records IP addresses for anonymous usage limits. Browser storage may hold a prompt temporarily while you continue or resume a sign-in flow, and may store interface preferences or custom design-system data on your device.':
    'يسجل التطبيق أيضًا عناوين IP لتطبيق حدود الاستخدام المجهول. وقد تحتفظ مساحة تخزين المتصفح بمطالبة مؤقتًا أثناء متابعة تسجيل الدخول أو استئنافه، كما قد تخزّن تفضيلات الواجهة أو بيانات أنظمة التصميم المخصصة على جهازك.',
  'To provide sign-in, account, chat, project, and generation features.':
    'لتوفير ميزات تسجيل الدخول والحساب والمحادثات والمشاريع وإنشاء التطبيقات.',
  'To send your request and related inputs to the v0 service so it can generate app content.':
    'لإرسال طلبك والمدخلات المرتبطة به إلى خدمة v0 كي تنشئ محتوى التطبيق.',
  'To protect the service, enforce usage limits, and troubleshoot failures.':
    'لحماية الخدمة وتطبيق حدود الاستخدام واستكشاف الأعطال وإصلاحها.',
  'To retain your account and associate your chats and projects with it.':
    'للاحتفاظ بحسابك وربط محادثاتك ومشاريعك به.',
  "The v0 Platform API processes generation requests and may store chat and project content under its own terms and privacy practices. Review the v0 provider's current policies before submitting sensitive information. The service may also use its configured hosting and database providers to run the application and store account and ownership records. The exact providers depend on the deployment configuration.":
    'تعالج واجهة v0 Platform API طلبات الإنشاء، وقد تخزّن محتوى المحادثات والمشاريع وفقًا لشروطها وممارسات الخصوصية الخاصة بها. راجع السياسات الحالية لموفر v0 قبل إرسال معلومات حساسة. وقد تستخدم الخدمة أيضًا موفري الاستضافة وقواعد البيانات المهيئين لتشغيل التطبيق وتخزين الحسابات وسجلات الملكية. ويعتمد تحديد هؤلاء الموفرين على إعدادات النشر.',
  'You can request deletion of your Masidy account through the account controls. The account deletion endpoint attempts to delete the local account record; related-record deletion depends on the configured database. It does not delete chats or projects held by v0 or other providers, which may need to be deleted with the relevant provider. Operational records, including usage-limit logs, may remain as required for security, service operation, or legal obligations.':
    'يمكنك طلب حذف حسابك في مسدي من عناصر التحكم بالحساب. تحاول نقطة نهاية حذف الحساب إزالة سجل الحساب المحلي؛ أما حذف السجلات المرتبطة فيعتمد على قاعدة البيانات المهيأة. ولا يؤدي ذلك إلى حذف المحادثات أو المشاريع الموجودة لدى v0 أو موفرين آخرين، وقد يلزم حذفها لدى الموفر المعني. وقد تُحتفظ بالسجلات التشغيلية، بما فيها سجلات حدود الاستخدام، عند الحاجة لأغراض الأمان أو تشغيل الخدمة أو الوفاء بالالتزامات القانونية.',
  'Masidy uses password hashing and server-side credentials for authentication and provider access. No internet service can promise absolute security. Do not submit passwords, payment details, private keys, or other sensitive personal information in prompts or uploaded content. You may stop using the service and request account deletion through the account page.':
    'تستخدم مسدي بصمة كلمات المرور وبيانات اعتماد على الخادم للتحقق من الهوية والوصول إلى الموفرين. لا يمكن لأي خدمة عبر الإنترنت ضمان الأمان المطلق. لا ترسل كلمات المرور أو بيانات الدفع أو المفاتيح الخاصة أو غيرها من المعلومات الشخصية الحساسة ضمن المطالبات أو المحتوى المرفوع. يمكنك التوقف عن استخدام الخدمة وطلب حذف حسابك من صفحة الحساب.',
  'The service is not designed for children who are not legally permitted to use online services in their location.':
    'لم تُصمم الخدمة للأطفال غير المسموح لهم قانونيًا باستخدام الخدمات عبر الإنترنت في مواقعهم.',
  'For privacy questions or requests, contact the service operator using the contact details that should be published here before public launch.':
    'للاستفسارات أو الطلبات المتعلقة بالخصوصية، تواصل مع مشغّل الخدمة عبر بيانات الاتصال التي ينبغي نشرها هنا قبل الإطلاق العام.',
  'Authentication uses a session cookie so the service can recognize your signed-in session and protect account features. These cookies are necessary for the service to work.':
    'يستخدم التحقق من الهوية ملف تعريف ارتباط للجلسة كي تتعرف الخدمة على جلستك المسجلة وتحمي ميزات الحساب. وهذه الملفات ضرورية لعمل الخدمة.',
  'The app may use session storage to temporarily preserve a prompt while you move through authentication, and local storage to remember interface preferences and custom design-system data. This data stays in your browser unless you clear it; clearing it may remove saved preferences or an unfinished prompt.':
    'قد يستخدم التطبيق تخزين الجلسة للاحتفاظ مؤقتًا بمطالبة أثناء متابعة خطوات التحقق من الهوية، والتخزين المحلي لتذكر تفضيلات الواجهة وبيانات أنظمة التصميم المخصصة. تبقى هذه البيانات في متصفحك ما لم تمسحها؛ وقد يؤدي مسحها إلى إزالة التفضيلات المحفوظة أو مطالبة غير مكتملة.',
  'The current application code does not include an analytics or advertising cookie system. You can manage or clear cookies and browser storage through your browser settings. Blocking essential cookies may prevent sign-in and other features from working correctly.':
    'لا يتضمن كود التطبيق الحالي نظامًا لملفات تعريف ارتباط التحليلات أو الإعلانات. يمكنك إدارة ملفات تعريف الارتباط ومساحة تخزين المتصفح أو مسحها من إعدادات المتصفح. وقد يمنع حظر الملفات الضرورية تسجيل الدخول وميزات أخرى من العمل بشكل صحيح.',
  "Violate applicable law, regulations, or another person's rights.":
    'مخالفة القوانين أو اللوائح المعمول بها أو حقوق الآخرين.',
  'Generate, distribute, or deploy malware, phishing pages, credential theft, or tools intended to compromise systems.':
    'إنشاء أو توزيع أو نشر برمجيات ضارة أو صفحات تصيد أو أدوات لسرقة بيانات الاعتماد أو اختراق الأنظمة.',
  'Access, probe, scan, or disrupt systems, accounts, or data without authorization.':
    'الوصول إلى الأنظمة أو الحسابات أو البيانات أو فحصها أو تعطيلها دون تصريح.',
  'Submit personal, confidential, or copyrighted material without the required rights or permission.':
    'إرسال مواد شخصية أو سرية أو محمية بحقوق النشر دون الحقوق أو الأذونات اللازمة.',
  'Harass, threaten, defraud, impersonate, or facilitate harm to others.':
    'مضايقة الآخرين أو تهديدهم أو الاحتيال عليهم أو انتحال شخصياتهم أو تسهيل إيذائهم.',
  'Bypass usage limits, interfere with service operation, or attempt to gain unauthorized access.':
    'تجاوز حدود الاستخدام أو التدخل في تشغيل الخدمة أو محاولة الوصول غير المصرح به.',
  'You are responsible for the content you submit and for reviewing, testing, and securing generated code before using it. Do not include secrets or sensitive personal information in prompts. Third-party providers may apply additional acceptable-use rules.':
    'أنت مسؤول عن المحتوى الذي ترسله وعن مراجعة الكود المُنشأ واختباره وتأمينه قبل استخدامه. لا تضع أسرارًا أو معلومات شخصية حساسة في المطالبات. وقد يطبق موفرو الأطراف الخارجية قواعد إضافية للاستخدام المقبول.',
  'Access may be limited or suspended when necessary to protect users, providers, or the service, or to comply with law. To report suspected abuse, contact the service operator using the contact details that should be published here before public launch.':
    'قد يُقيّد الوصول أو يُعلّق عند الضرورة لحماية المستخدمين أو الموفرين أو الخدمة، أو للامتثال للقانون. للإبلاغ عن إساءة مشتبه بها، تواصل مع مشغّل الخدمة عبر بيانات الاتصال التي ينبغي نشرها هنا قبل الإطلاق العام.',
  'You must be legally able to agree to these terms and provide accurate account information. Keep your credentials secure. You are responsible for activity carried out through your account and for ensuring your use complies with applicable law.':
    'يجب أن تكون مؤهلًا قانونيًا للموافقة على هذه الشروط وأن تقدم معلومات حساب دقيقة. حافظ على سرية بيانات اعتمادك. أنت مسؤول عن النشاط الذي يتم عبر حسابك وعن ضمان امتثالك للقوانين المعمول بها.',
  'You are responsible for prompts, files, and other content you submit, and must have the rights and permissions needed to submit them. AI-generated output may be inaccurate, incomplete, insecure, or similar to content generated for others. Review, test, and secure all output before using or deploying it. Do not treat it as professional, legal, medical, financial, or security advice. Rights in generated output may also be affected by the terms of the underlying provider and any third-party materials used.':
    'أنت مسؤول عن المطالبات والملفات وسائر المحتوى الذي ترسله، ويجب أن تمتلك الحقوق والأذونات اللازمة لإرساله. قد تكون المخرجات المُنشأة بالذكاء الاصطناعي غير دقيقة أو غير مكتملة أو غير آمنة أو مشابهة لمحتوى أُنشئ للآخرين. راجع جميع المخرجات واختبرها وأمّنها قبل استخدامها أو نشرها. لا تعتبرها نصيحة مهنية أو قانونية أو طبية أو مالية أو أمنية. وقد تتأثر حقوق المخرجات المُنشأة أيضًا بشروط الموفر الأساسي وأي مواد تابعة لأطراف خارجية مستخدمة.',
  "You may not use Masidy to break the law, infringe others' rights, distribute malicious code, compromise systems, evade access controls, abuse the service, or submit content you are not authorized to use. The Acceptable Use Policy provides additional detail.":
    'لا يجوز لك استخدام مسدي لمخالفة القانون أو انتهاك حقوق الآخرين أو توزيع كود ضار أو اختراق الأنظمة أو التحايل على ضوابط الوصول أو إساءة استخدام الخدمة أو إرسال محتوى غير مصرح لك باستخدامه. تقدم سياسة الاستخدام المقبول تفاصيل إضافية.',
  'Masidy depends on third-party services, including the v0 Platform API. Their availability, features, limits, and terms may change. The service or any feature may be unavailable, changed, or discontinued. You are responsible for provider charges or accounts that apply to your use.':
    'تعتمد مسدي على خدمات أطراف خارجية، بما فيها واجهة v0 Platform API. وقد يتغير توافرها وميزاتها وحدودها وشروطها. وقد تصبح الخدمة أو أي ميزة غير متاحة أو تتغير أو تتوقف. أنت مسؤول عن رسوم الموفرين أو الحسابات التي تنطبق على استخدامك.',
  'You may stop using Masidy and request deletion of your account. We may suspend or restrict access when reasonably necessary to protect the service, comply with law, or address a breach of these terms. Deleting a Masidy account may not delete content held directly by third-party providers.':
    'يمكنك التوقف عن استخدام مسدي وطلب حذف حسابك. وقد نعلّق الوصول أو نقيّده عندما يكون ذلك ضروريًا بصورة معقولة لحماية الخدمة أو الامتثال للقانون أو معالجة خرق لهذه الشروط. وقد لا يؤدي حذف حساب مسدي إلى حذف المحتوى الموجود مباشرة لدى موفري الأطراف الخارجية.',
  "To the extent permitted by law, the service is provided 'as is' and without warranties that it will be uninterrupted, error-free, secure, or suitable for a particular purpose. To the extent permitted by law, the service operator is not liable for indirect, incidental, special, consequential, or exemplary loss arising from use of the service. Nothing in these terms limits rights or liability that cannot legally be limited.":
    'إلى الحد الذي يسمح به القانون، تُقدم الخدمة «كما هي» دون ضمانات بأنها ستعمل دون انقطاع أو أخطاء، أو بأنها آمنة أو ملائمة لغرض معين. وإلى الحد الذي يسمح به القانون، لا يتحمل مشغّل الخدمة مسؤولية الخسائر غير المباشرة أو العرضية أو الخاصة أو التبعية أو النموذجية الناشئة عن استخدام الخدمة. ولا تحد هذه الشروط من الحقوق أو المسؤولية التي لا يجوز قانونًا الحد منها.',
  'These terms may be updated as the service changes. The revised date will be shown above. The operator must specify its legal name, contact information, and governing law/jurisdiction here before these terms are relied on as final legal terms.':
    'قد تُحدّث هذه الشروط مع تغيّر الخدمة. وسيُعرض تاريخ المراجعة أعلاه. يجب على المشغّل تحديد اسمه القانوني وبيانات الاتصال والقانون والاختصاص القضائي الحاكمين هنا قبل اعتماد هذه الشروط بصفتها نهائية.',
  'Show chat': 'عرض المحادثة',
  'Project view': 'عرض المشروع',
  'Show preview': 'عرض المعاينة',
  'Show code': 'عرض الشيفرة',
  'New chat': 'محادثة جديدة',
  'Chat and project actions': 'إجراءات المحادثة والمشروع',
  'Publishing project': 'جارٍ نشر المشروع',
  'Publish project': 'نشر المشروع',
  'Publishing…': 'جارٍ النشر…',
  Publish: 'نشر',
  'Rename chat': 'إعادة تسمية المحادثة',
  'Enter a new name for this chat.': 'أدخل اسمًا جديدًا لهذه المحادثة.',
  'Chat name': 'اسم المحادثة',
  'Renaming...': 'جارٍ تغيير الاسم...',
  Rename: 'إعادة التسمية',
  'Set up project settings': 'إعدادات المشروع',
  'Project settings belong to a project. Add this chat to an existing project or create a new project to open its settings.':
    'ترتبط إعدادات المشروع بمشروع. أضف هذه المحادثة إلى مشروع موجود أو أنشئ مشروعًا جديدًا لفتح إعداداته.',
  'Existing project': 'مشروع موجود',
  'You do not have a project yet. Create one for this chat to manage its settings.':
    'ليس لديك مشروع بعد. أنشئ مشروعًا لهذه المحادثة لإدارة إعداداتها.',
  'Creating…': 'جارٍ الإنشاء…',
  'Opening…': 'جارٍ الفتح…',
  'Add chat and open settings': 'إضافة المحادثة وفتح الإعدادات',
  'Invite to this chat': 'دعوة إلى هذه المحادثة',
  'Copy the chat link to share it. Access follows this chat visibility.':
    'انسخ رابط المحادثة لمشاركته. يخضع الوصول لإعدادات ظهور هذه المحادثة.',
  'Copy link': 'نسخ الرابط',
  'Could not load this chat': 'تعذّر تحميل هذه المحادثة',
  'Back to chats': 'العودة إلى المحادثات',
  'Transfer is not available yet': 'النقل غير متاح بعد',
  'Archive is not available yet': 'الأرشفة غير متاحة بعد',
  'Invite people to this chat': 'دعوة أشخاص إلى هذه المحادثة',
  Invite: 'دعوة',
  'Git branch controls are not connected yet':
    'عناصر التحكم بفرع Git غير متصلة بعد',
  'Current Git branch unavailable': 'فرع Git الحالي غير متاح',
  'Selected project and design system apply to this new chat.':
    'ينطبق المشروع ونظام التصميم المحددان على هذه المحادثة الجديدة.',
  'Finance calculator': 'حاسبة مالية',
  'Dashboards': 'لوحات التحكم',
  'AI': 'الذكاء الاصطناعي',
  'Blog & Portfolio': 'المدونات ومعارض الأعمال',
  'Components': 'المكونات',
  'Login & Sign Up': 'تسجيل الدخول وإنشاء الحساب',
  'Apps & Games': 'التطبيقات والألعاب',
  'SaaS analytics dashboard': 'لوحة تحليلات للبرمجيات كخدمة',
  'A complete analytics workspace with KPIs, charts, filters, and responsive navigation.':
    'مساحة تحليلات متكاملة تضم مؤشرات أداء ورسومًا بيانية وعوامل تصفية وتنقلًا متجاوبًا.',
  'Product landing page': 'صفحة هبوط لمنتج',
  'A high-conversion marketing site with a strong hero, feature story, and pricing.':
    'موقع تسويقي عالي التحويل مع قسم رئيسي قوي وعرض للمزايا والأسعار.',
  'E-commerce storefront': 'متجر إلكتروني',
  'A product catalog and shopping experience with filters, detail views, and cart.':
    'كتالوج منتجات وتجربة تسوق تشمل عوامل تصفية وصفحات تفاصيل وسلة مشتريات.',
  'Startup and SaaS website': 'موقع شركة ناشئة وبرمجيات كخدمة',
  'A complete business website starter with startup and SaaS sections and pages.':
    'قالب موقع أعمال متكامل يضم أقسامًا وصفحات للشركات الناشئة والبرمجيات كخدمة.',
  'Primer': 'Primer',
  "GitHub's open-source design system.": 'نظام التصميم مفتوح المصدر من GitHub.',
  "IBM's open-source design system.": 'نظام التصميم مفتوح المصدر من IBM.',
  "Google's Material design guidance.": 'إرشادات التصميم Material من Google.',
  "Microsoft's Fluent design guidance.": 'إرشادات التصميم Fluent من Microsoft.',
  "AWS's open-source design system.": 'نظام التصميم مفتوح المصدر من AWS.',
  'Composable, accessible interface patterns.':
    'أنماط واجهات قابلة للتركيب ومراعية لإمكانية الوصول.',
  'Default': 'افتراضي',
  'Project': 'مشروع',
  'Select model, current model': 'اختر النموذج، النموذج الحالي',
  'Use your email and password to sign in':
    'استخدم بريدك الإلكتروني وكلمة المرور لتسجيل الدخول',
  'Create your account to get started': 'أنشئ حسابك للبدء',
  'Cookie Policy': 'سياسة ملفات تعريف الارتباط',
  'Acceptable Use Policy': 'سياسة الاستخدام المقبول',
  'Terms of Service': 'شروط الخدمة',
  'Last updated October 8, 2026': 'آخر تحديث: ٨ أكتوبر ٢٠٢٦',
  'This is a service-specific starting point, not legal advice. Before public launch, the service operator should confirm this document, publish its legal business name and contact details, and select applicable governing law and jurisdiction.':
    'هذه نقطة انطلاق خاصة بالخدمة وليست استشارة قانونية. قبل الإطلاق العام، ينبغي لمشغّل الخدمة مراجعة هذه الوثيقة ونشر الاسم القانوني للنشاط التجاري وبيانات الاتصال وتحديد القانون والاختصاص القضائي المعمول بهما.',
  'Using the service': 'استخدام الخدمة',
  'Your content and AI-generated output': 'المحتوى الذي تقدمه والمخرجات المُنشأة بالذكاء الاصطناعي',
  'Acceptable use': 'الاستخدام المقبول',
  'Third-party services and availability': 'خدمات الأطراف الخارجية والتوافر',
  'Accounts and termination': 'الحسابات وإنهاء الخدمة',
  'Disclaimers and liability': 'إخلاء المسؤولية والمسؤولية القانونية',
  'Changes and governing law': 'التغييرات والقانون الحاكم',
  'Essential cookies': 'ملفات تعريف الارتباط الضرورية',
  'Browser storage': 'تخزين المتصفح',
  'Analytics and controls': 'التحليلات وعناصر التحكم',
  'You may not use Masidy to': 'يُحظر استخدام مسدي من أجل',
  'Your responsibility': 'مسؤوليتك',
  'Enforcement and reporting': 'التنفيذ والإبلاغ',
  'Information we process': 'المعلومات التي نعالجها',
  'How information is used': 'كيفية استخدام المعلومات',
  'Service providers and transfers': 'مقدمو الخدمة ونقل البيانات',
  'Retention and deletion': 'الاحتفاظ بالبيانات وحذفها',
  'Security and your choices': 'الأمان والخيارات المتاحة لك',
  'Children and contact': 'الأطفال والتواصل',
  Legal: 'الشؤون القانونية',
  'Legal and policies': 'الشؤون القانونية والسياسات',
  'Landing page': 'صفحة هبوط',
  'Todo app': 'تطبيق مهام',
  'Blog': 'مدونة',
  'Portfolio': 'معرض أعمال',
  'Chat app': 'تطبيق محادثة',
  'Calculator': 'آلة حاسبة',
  'Add a backend API': 'أضف واجهة برمجية خلفية',
  'Add a database': 'أضف قاعدة بيانات',
  'Add authentication': 'أضف المصادقة',
  'Make it mobile responsive': 'اجعله متجاوبًا مع الهواتف',
  'Add dark mode': 'أضف الوضع الداكن',
  'Deploy this': 'انشر هذا المشروع',
  'Error code': 'رمز الخطأ',
  'Try Again': 'حاول مرة أخرى',
  'No files to display': 'لا توجد ملفات لعرضها',
  'Project files': 'ملفات المشروع',
  'Source content is empty': 'محتوى المصدر فارغ',
  'Preview version': 'إصدار المعاينة',
  Latest: 'الأحدث',
  'Go back': 'رجوع',
  'Go forward': 'تقدّم',
  'Use desktop viewport': 'استخدم عرض سطح المكتب',
  'Use mobile viewport': 'استخدم عرض الهاتف',
  'Desktop viewport': 'عرض سطح المكتب',
  'Mobile viewport': 'عرض الهاتف',
  'Preview path': 'مسار المعاينة',
  'Open published project in a new tab': 'افتح المشروع المنشور في علامة تبويب جديدة',
  'Open preview in a new tab': 'افتح المعاينة في علامة تبويب جديدة',
  'Open published site': 'افتح الموقع المنشور',
  'Open preview': 'افتح المعاينة',
  'Refresh preview': 'تحديث المعاينة',
  'Preview actions': 'إجراءات المعاينة',
  'View code': 'عرض الشيفرة',
  'Exit fullscreen': 'إنهاء وضع ملء الشاشة',
  Fullscreen: 'ملء الشاشة',
  'Copy preview link': 'نسخ رابط المعاينة',
  'Copy chat link': 'نسخ رابط المحادثة',
  'Assign this chat to a project before deploying.':
    'أضف هذه المحادثة إلى مشروع قبل النشر.',
  'A completed project version is required to deploy.':
    'يلزم إصدار مكتمل من المشروع لنشره.',
  'Export project': 'تصدير المشروع',
  'Start a conversation to see your app here':
    'ابدأ محادثة لعرض تطبيقك هنا',
  'Generate a project to see the code here':
    'أنشئ مشروعًا لعرض الشيفرة هنا',
  'Export Project': 'تصدير المشروع',
  'Download ZIP': 'تنزيل ZIP',
  'Download all project files as a ZIP archive. You can then open them locally in any code editor.':
    'نزّل جميع ملفات المشروع في أرشيف ZIP، ثم افتحها محليًا باستخدام أي محرر شيفرة.',
  'Generate a completed project version before exporting its files.':
    'أنشئ إصدارًا مكتملًا من المشروع قبل تصدير ملفاته.',
  'Push to GitHub': 'رفع إلى GitHub',
  'Download the ZIP above': 'نزّل ملف ZIP أعلاه',
  'Create a new repository at': 'أنشئ مستودعًا جديدًا على',
  'Extract the ZIP and drag & drop the files into your repo':
    'فك ضغط ZIP واسحب الملفات وأفلتها في مستودعك',
  'Commit and push': 'أنشئ commit ثم ارفع التغييرات',
  'Open GitHub': 'فتح GitHub',
  'Version': 'الإصدار',
  'Open chat menu': 'فتح قائمة المحادثة',
  'Open in Masidy': 'فتح في مسدي',
  'Duplicate Chat': 'تكرار المحادثة',
  'Delete Chat': 'حذف المحادثة',
  'This will create a copy of the current chat. You\'ll be redirected to the new chat once it\'s created.':
    'سيؤدي هذا إلى إنشاء نسخة من المحادثة الحالية. ستنتقل إلى المحادثة الجديدة بعد إنشائها.',
  'Duplicating...': 'جارٍ تكرار المحادثة...',
  'Deleting...': 'جارٍ الحذف...',
  'Select chat': 'اختر محادثة',
  'Project menu': 'قائمة المشروع',
  'Remove from Favorites': 'إزالة من المفضلة',
  'Add to Favorites': 'إضافة إلى المفضلة',
  'Copy Link': 'نسخ الرابط',
  'Chat visibility': 'ظهور المحادثة',
  'Duplicate…': 'تكرار...',
  'Invite to chat': 'دعوة إلى المحادثة',
  'Copy the chat link to share it. Access follows this chat visibility:':
    'انسخ رابط المحادثة لمشاركته. ويتبع الوصول إعداد ظهور هذه المحادثة:',
  'Rename Chat': 'إعادة تسمية المحادثة',
  'Change Chat Visibility': 'تغيير ظهور المحادثة',
  'Choose who can see and access this chat.':
    'اختر من يمكنه رؤية هذه المحادثة والوصول إليها.',
  'Only you can see this chat': 'أنت فقط من يمكنه رؤية هذه المحادثة',
  'Anyone can see this chat': 'يمكن لأي شخص رؤية هذه المحادثة',
  'Team members can see this chat': 'يمكن لأعضاء الفريق رؤية هذه المحادثة',
  'Team members can see and edit this chat':
    'يمكن لأعضاء الفريق رؤية هذه المحادثة وتعديلها',
  'Only people with the link can see this chat':
    'يمكن للأشخاص الذين لديهم الرابط فقط رؤية هذه المحادثة',
  'Changing...': 'جارٍ التغيير...',
  'Change Visibility': 'تغيير الظهور',
  'Could not change visibility': 'تعذّر تغيير الظهور',
  Public: 'عام',
  Unlisted: 'غير مدرج',
  "You've reached your daily limit": 'لقد وصلت إلى الحد اليومي المسموح به',
  'Your generations reset at midnight UTC.':
    'يتجدد رصيد الإنشاءات عند منتصف الليل بالتوقيت العالمي المنسق.',
  'Resets in': 'إعادة التعيين خلال',
  'generations today': 'عمليات إنشاء اليوم',
  'Sign In / Create Account': 'تسجيل الدخول / إنشاء حساب',
  Dismiss: 'تجاهل',
  'Toggle theme': 'تبديل المظهر',
  'Previous branch': 'الفرع السابق',
  'Next branch': 'الفرع التالي',
  'Previous slide': 'الشريحة السابقة',
  'Next slide': 'الشريحة التالية',
  'Enter URL...': 'أدخل الرابط...',
  Console: 'وحدة التحكم',
  'No console output': 'لا توجد مخرجات لوحدة التحكم',
  'Thinking...': 'جارٍ التفكير...',
  'Thought for': 'فكّر لمدة',
  seconds: 'ثوانٍ',
  'Checking for issues...': 'جارٍ التحقق من المشكلات...',
  'No issues found': 'لم يتم العثور على مشكلات',
  'Starting tasks...': 'جارٍ بدء المهام...',
  'Analyzing requirements...': 'جارٍ تحليل المتطلبات...',
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (text: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem(localeStorageKey)
      if (storedLocale === 'ar' || storedLocale === 'en') {
        setLocaleState(storedLocale)
      }
    } catch (error) {
      console.error('Could not restore language preference:', error)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    try {
      window.localStorage.setItem(localeStorageKey, nextLocale)
    } catch (error) {
      console.error('Could not save language preference:', error)
    }
  }, [])

  const t = useCallback(
    (text: string) =>
      locale === 'ar' ? (arabicTranslations[text] ?? text) : text,
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider.')
  }
  return context
}

export function LocalizedText({ text }: { text: string }) {
  const { t } = useLocale()
  return <>{t(text)}</>
}
