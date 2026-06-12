export const formatDate = (dateString: string, locale: string = 'bn') => {
    if (!dateString) return '';
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) return dateString;
        
        const monthIndex = date.getMonth();
        const monthsShortEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsShortBn = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
        
        const monthName = locale === 'bn' ? monthsShortBn[monthIndex] : monthsShortEn[monthIndex];
        
        if (locale === 'bn') {
            const toBengaliNumber = (num: number) => {
                const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
                return num.toString().split('').map(digit => bnNums[parseInt(digit, 10)] || digit).join('');
            };
            return `${toBengaliNumber(day)} ${monthName}, ${toBengaliNumber(year)}`;
        }
        return `${day} ${monthName}, ${year}`;
    } catch {
        return dateString;
    }
};

export const formatCompactNumber = (number: number) => {
    try {
        if (number < 1000) {
            return number.toLocaleString('en-US');
        }
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(number);
    } catch {
        if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
        if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
        return number.toString();
    }
};

export const getCurrencySymbol = (code: string) => {
    return '৳';
};

export const formatAmount = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    try {
        return num.toLocaleString('en-US');
    } catch {
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }
};

const MONTHS_MAP: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

export const getMonthIndex = (monthName: string): number => {
    if (!monthName) return 0;
    return MONTHS_MAP[monthName.toLowerCase()] ?? 0;
};

export const getMonthName = (monthIndex: number, isBengali: boolean): string => {
    const monthsEn = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const monthsBn = [
        "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
        "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
    ];
    const index = Math.max(0, Math.min(11, Math.floor(monthIndex)));
    return isBengali ? monthsBn[index] : monthsEn[index];
};

