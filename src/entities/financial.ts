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
