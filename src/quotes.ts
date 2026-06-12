
export interface Quote {
    line1: string;
    line2: string;
    highlight: string;
    highlightSuffix?: string;
    italicHighlight?: boolean;
}

export const INSPIRATIONAL_QUOTES: Quote[] = [
    { line1: "Mastering your", highlight: "Wealth", line2: "is a silent", highlightSuffix: "Art." },
    { line1: "Discipline in", highlight: "Capital", line2: "is", highlightSuffix: "Freedom in Life." },
    { line1: "Every small", highlight: "Cent", line2: "is a", highlightSuffix: "Seed for tomorrow." },
    { line1: "Your future", highlight: "Self", line2: "depends on today's", highlightSuffix: "Balance." },
    { line1: "Wealth is the", highlight: "Ability", line2: "to fully experience", highlightSuffix: "Life." },
    { line1: "The goal is", highlight: "Financial Peace", line2: "not just deep", highlightSuffix: "Pockets." },
    { line1: "Measure your", highlight: "Progress", line2: "not just your", highlightSuffix: "Possessions." },
    { line1: "True", highlight: "Wealth", line2: "is what survives when money is", highlightSuffix: "Gone." },
    { line1: "Invest in", highlight: "Yourself", line2: "it pays the best", highlightSuffix: "Interest." },
    { line1: "Financial", highlight: "Freedom", line2: "is a mindset before it's a", highlightSuffix: "Number." },
    { line1: "Quiet", highlight: "Contentment", line2: "is the greatest", highlightSuffix: "Wealth." },
    { line1: "Control your", highlight: "Money", line2: "or it will control", highlightSuffix: "You." },
    { line1: "A budget is", highlight: "Telling Your Money", line2: "where to", highlightSuffix: "Go." },
    { line1: "Savings is the", highlight: "Gap", line2: "between", highlightSuffix: "Ego and Income." },
    { line1: "Focus on the", highlight: "Process", line2: "the profits will", highlightSuffix: "Follow." },
    { line1: "Wealth is", highlight: "Hidden", line2: "and compounding is", highlightSuffix: "Magic." },
    { line1: "Be patient with your", highlight: "Capital", line2: "but aggressive with your", highlightSuffix: "Goals." },
    { line1: "Your bank", highlight: "Account", line2: "is a reflection of your", highlightSuffix: "Habits." },
    { line1: "Minimalism", highlight: "Financial", line2: "is the ultimate", highlightSuffix: "Sophistication." },
    { line1: "Plan for the", highlight: "Future", line2: "but live in the", highlightSuffix: "Present." },
    { line1: "Capital is", highlight: "Courage", line2: "waiting to be", highlightSuffix: "Used." },
    { line1: "Financial", highlight: "Clarity", line2: "begins with a single", highlightSuffix: "Decision." }
];

export const BN_INSPIRATIONAL_QUOTES: Quote[] = [
    { line1: "আপনার", highlight: "সম্পদ", line2: "নিয়ন্ত্রণ করা একটি নীরব", highlightSuffix: "শিল্প।" },
    { line1: "মূলধনে", highlight: "শৃঙ্খলা", line2: "হলো জীবনে", highlightSuffix: "স্বাধীনতা।" },
    { line1: "প্রতিটি ছোট", highlight: "পয়সা", line2: "আগামীকালের জন্য একটি", highlightSuffix: "বীজ।" },
    { line1: "আপনার ভবিষ্যৎ", highlight: "সত্তা", line2: "আজকের ব্যালেন্সের ওপর", highlightSuffix: "নির্ভর করে।" },
    { line1: "সম্পদ হলো জীবনকে", highlight: "সম্পূর্ণরূপে", line2: "অনুভব করার", highlightSuffix: "ক্ষমতা।" },
    { line1: "লক্ষ্য হলো", highlight: "আর্থিক শান্তি", line2: "শুধু গভীর পকেট", highlightSuffix: "নয়।" },
    { line1: "আপনার", highlight: "অগ্রগতি", line2: "পরিমাপ করুন, শুধু সম্পত্তি", highlightSuffix: "নয়।" },
    { line1: "প্রকৃত", highlight: "সম্পদ", line2: "হলো টাকা চলে গেলে যা", highlightSuffix: "টিকে থাকে।" },
    { line1: "নিজের ওপর", highlight: "বিনিয়োগ", line2: "করুন, এটি সেরা লভ্যাংশ", highlightSuffix: "দেয়।" },
    { line1: "আর্থিক", highlight: "স্বাধীনতা", line2: "সংখ্যা হওয়ার আগে একটি", highlightSuffix: "মানসিকতা।" },
    { line1: "শান্ত", highlight: "সন্তুষ্টি", line2: "হলো সবচেয়ে বড়", highlightSuffix: "সম্পদ।" },
    { line1: "আপনার", highlight: "অর্থ", line2: "নিয়ন্ত্রণ করুন, অন্যথায় এটি আপনাকে নিয়ন্ত্রণ", highlightSuffix: "করবে।" },
    { line1: "বাজেট হলো আপনার", highlight: "অর্থকে বলা", line2: "সে কোথায়", highlightSuffix: "যাবে।" },
    { line1: "সঞ্চয় হলো অহংকার এবং", highlight: "আয়ের", line2: "मध्यवर्ती", highlightSuffix: "ব্যবধান।" },
    { line1: "প্রক্রিয়ার ওপর", highlight: "মনোযোগ", line2: "দিন, লাভ নিজেই", highlightSuffix: "আসবে।" },
    { line1: "সম্পদ হলো", highlight: "লুকানো", line2: "এবং চক্রবৃদ্ধি হলো", highlightSuffix: "যাদু।" },
    { line1: "আপনার মূলধনের প্রতি", highlight: "ধৈর্যশীল", line2: "হোন কিন্তু লক্ষ্যের প্রতি", highlightSuffix: "আগ্রাসী হোন।" },
    { line1: "আপনার ব্যাংক", highlight: "অ্যাকাউন্ট", line2: "হলো আপনার অভ্যাসের", highlightSuffix: "প্রতিফলন।" },
    { line1: "আর্থিক", highlight: "পরিমিতিবোধ", line2: "হলো পরম", highlightSuffix: "অভিজাত্য।" },
    { line1: "ভবিষ্যতের জন্য", highlight: "পরিকল্পনা", line2: "করুন কিন্তু বর্তমানে", highlightSuffix: "বাস করুন।" },
    { line1: "মূলধন হলো", highlight: "সাহস", line2: "যা ব্যবহারের অপেক্ষায়", highlightSuffix: "রয়েছে।" },
    { line1: "আর্থিক", highlight: "স্পষ্টতা", line2: "শুরু হয় একটি মাত্র", highlightSuffix: "সিদ্ধান্তের মাধ্যমে।" }
];
