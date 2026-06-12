export const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) return dateString;
        const monthName = date.toLocaleString('default', { month: 'short' });
        return `${day} ${monthName}, ${year}`;
    } catch {
        return dateString;
    }
};

export const formatCompactNumber = (number: number) => {
    if (number < 1000) return number.toLocaleString();
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(number);
};

export const getCurrencySymbol = (code: string) => {
    return '৳';
};
