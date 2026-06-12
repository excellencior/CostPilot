import React, { useState, useEffect, useRef } from 'react';
import { Transaction, View } from '../../entities/types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LocalRepository } from '../../infrastructure/local/local-repository';
import { formatDate } from '../../entities/financial';
import Dropdown from '../../shared/ui/Dropdown';
import DatePicker from '../../shared/ui/DatePicker';
import TimePicker, { TimePickerHandle } from '../../shared/ui/TimePicker';
import ConfirmModal from '../../shared/ui/ConfirmModal';
import { useLocalBackup } from '../../application/contexts/LocalBackupContext';
import { toast } from 'react-hot-toast';

interface SettingsProps {
	onNavigate: (view: View) => void;
	transactions: Transaction[];
	currency: string;
}

const CURRENCIES = [
	{ code: 'USD', name: 'US Dollar', symbol: '$', icon: 'attach_money' },
	{ code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', icon: 'payments' },
	{ code: 'INR', name: 'Indian Rupee', symbol: '₹', icon: 'currency_rupee' },
	{ code: 'EUR', name: 'Euro', symbol: '€', icon: 'euro' },
];

const Settings: React.FC<SettingsProps> = ({
	onNavigate,
	transactions,
	currency
}) => {
	const backupService = useLocalBackup();
	const { isEnabled, backupTime, enableBackup, disableBackup, setBackupTime, performManualBackup, restoreFromBackup, hasDirectoryAccess, requestDirectoryAccess, directoryName, backupStatus, statusMessage, lastBackupTime, getMostRecentBackup, parseBackupFile } = backupService;

	const [startDate, setStartDate] = useState('');
	const timePickerRef = useRef<TimePickerHandle>(null);
	const [endDate, setEndDate] = useState('');

	// Restore on toggle state
	const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
	const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
	const [showManual, setShowManual] = useState(false);
	const [showMergedModal, setShowMergedModal] = useState(false);
	const [recentBackupFile, setRecentBackupFile] = useState<File | null>(null);
	const [backupMetadata, setBackupMetadata] = useState<{ transactions?: number, categories?: number } | null>(null);
	const [mergedEntries, setMergedEntries] = useState<any[]>([]);

	const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

	const toggleDarkMode = () => {
		const dark = document.documentElement.classList.toggle('dark');
		setIsDark(dark);
		LocalRepository.updateSettings({ theme: dark ? 'dark' : 'light' });
	};

	const formatLastBackup = (iso: string | null) => {
		if (!iso) return 'Never';
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		return d.toLocaleDateString();
	};

	const getStatusConfig = () => {
		switch (backupStatus) {
			case 'syncing':
				return { text: statusMessage || 'Backing up...', color: 'text-amber-500', icon: 'sync', spin: true };
			case 'success':
				return { text: statusMessage || 'Backup successful', color: 'text-green-500', icon: 'check_circle', spin: false };
			case 'error':
				return { text: statusMessage || 'Backup failed', color: 'text-rose-500', icon: 'error', spin: false };
			default:
				return { text: isEnabled ? 'Auto backup is on' : 'Auto backup is off', color: isEnabled ? 'text-green-500' : 'text-rose-400', icon: isEnabled ? 'folder_special' : 'folder_off', spin: false };
		}
	};

	const statusConfig = getStatusConfig();

	const loadLogoAsDataUrl = (): Promise<string> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext('2d');
				if (!ctx) { reject('No canvas context'); return; }
				ctx.drawImage(img, 0, 0);
				resolve(canvas.toDataURL('image/png'));
			};
			img.onerror = () => reject('Logo load failed');
			img.src = '/costpilot_logo.svg';
		});
	};

	const handleExportPDF = async () => {
		try {
			const doc = new jsPDF();
			const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
			const currencyCode = currency;
			const pageWidth = doc.internal.pageSize.getWidth();
			const pageHeight = doc.internal.pageSize.getHeight();

			// Brand colors
			const gold: [number, number, number] = [175, 143, 66];   // #AF8F42
			const darkGold: [number, number, number] = [145, 117, 54]; // #917536
			const stone900: [number, number, number] = [28, 25, 23];
			const stone500: [number, number, number] = [120, 113, 108];
			const expenseRed: [number, number, number] = [225, 29, 72];
			const incomeGreen: [number, number, number] = [5, 150, 105];

			// --- Header with logo ---
			let headerY = 14;
			try {
				const logoDataUrl = await loadLogoAsDataUrl();
				doc.addImage(logoDataUrl, 'PNG', 14, 10, 12, 14);
				headerY = 12;
			} catch { /* skip logo if it fails */ }

			// Title
			doc.setFontSize(20);
			doc.setTextColor(...stone900);
			doc.setFont('helvetica', 'bold');
			doc.text('CostPilot', 30, headerY + 5);

			doc.setFontSize(10);
			doc.setTextColor(...stone500);
			doc.setFont('helvetica', 'normal');
			doc.text('Financial Report', 30, headerY + 11);

			// Generated date
			doc.setFontSize(8);
			doc.setTextColor(...stone500);
			const genDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
			doc.text(`Generated: ${genDate}`, pageWidth - 14, headerY + 5, { align: 'right' });

			// Gold accent line
			doc.setDrawColor(...gold);
			doc.setLineWidth(0.8);
			doc.line(14, 28, pageWidth - 14, 28);

			let currentY = 34;

			// --- Date range ---
			let filteredTransactions = transactions;
			if (startDate || endDate) {
				filteredTransactions = transactions.filter(t => {
					const tDate = t.date;
					const afterStart = !startDate || tDate >= startDate;
					const beforeEnd = !endDate || tDate <= endDate;
					return afterStart && beforeEnd;
				});
				doc.setFontSize(9);
				doc.setTextColor(...stone500);
				doc.text(`Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`, 14, currentY);
				currentY += 8;
			}

			if (filteredTransactions.length === 0) {
				alert('No transactions found in the specified range.');
				return;
			}

			const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
			const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
			const balance = income - expense;

			// --- Summary table ---
			autoTable(doc, {
				startY: currentY,
				head: [['Summary', `Amount (${currencyCode})`]],
				body: [
					['Total Income', `${currencyCode} ${income.toLocaleString()}`],
					['Total Expense', `${currencyCode} ${expense.toLocaleString()}`],
					['Net Balance', `${currencyCode} ${balance.toLocaleString()}`]
				],
				theme: 'plain',
				headStyles: {
					fillColor: gold,
					textColor: [255, 255, 255],
					fontStyle: 'bold',
					fontSize: 10,
				},
				bodyStyles: {
					fontSize: 10,
					textColor: stone900,
				},
				alternateRowStyles: {
					fillColor: [250, 248, 243], // warm cream
				},
				columnStyles: {
					1: { halign: 'right', fontStyle: 'bold' }
				},
				styles: {
					cellPadding: 4,
					lineColor: [230, 225, 215],
					lineWidth: 0.3,
				},
				didParseCell: function (data) {
					if (data.section === 'body' && data.column.index === 1) {
						const row = data.row.index;
						if (row === 0) data.cell.styles.textColor = incomeGreen;
						if (row === 1) data.cell.styles.textColor = expenseRed;
						if (row === 2) data.cell.styles.textColor = balance >= 0 ? incomeGreen : expenseRed;
					}
				}
			});

			// --- Transactions table ---
			const tableData = filteredTransactions.map(t => {
				return [
					formatDate(t.date),
					t.title || 'Untitled',
					t.type === 'expense' ? `-${currencyCode} ${t.amount.toLocaleString()}` : `+${currencyCode} ${t.amount.toLocaleString()}`
				];
			});

			// Section heading
			const txStartY = (doc as any).lastAutoTable.finalY + 12;
			doc.setFontSize(11);
			doc.setTextColor(...stone900);
			doc.setFont('helvetica', 'bold');
			doc.text('Transaction Details', 14, txStartY);
			doc.setDrawColor(...gold);
			doc.setLineWidth(0.4);
			doc.line(14, txStartY + 2, 60, txStartY + 2);

			autoTable(doc, {
				startY: txStartY + 6,
				head: [['Date', 'Description', `Amount`]],
				body: tableData,
				theme: 'grid',
				headStyles: {
					fillColor: darkGold,
					textColor: [255, 255, 255],
					fontStyle: 'bold',
					fontSize: 10,
				},
				bodyStyles: {
					fontSize: 10,
					textColor: stone900,
				},
				alternateRowStyles: {
					fillColor: [252, 250, 246],
				},
				styles: {
					cellPadding: 4,
					lineColor: [230, 225, 215],
					lineWidth: 0.2,
				},
				columnStyles: {
					0: { cellWidth: 40 },
					2: { halign: 'right', cellWidth: 45, fontStyle: 'bold' }
				},
				didParseCell: function (data) {
					if (data.section === 'body' && data.column.index === 2) {
						const val = data.cell.text[0];
						if (val.startsWith('-')) {
							data.cell.styles.textColor = expenseRed;
						} else if (val.startsWith('+')) {
							data.cell.styles.textColor = incomeGreen;
						}
					}
				}
			});

			// --- Footer on every page ---
			const totalPages = (doc as any).internal.getNumberOfPages();
			for (let i = 1; i <= totalPages; i++) {
				doc.setPage(i);
				// Gold footer line
				doc.setDrawColor(...gold);
				doc.setLineWidth(0.4);
				doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
				// Footer text
				doc.setFontSize(7);
				doc.setTextColor(...stone500);
				doc.text('CostPilot - Personal Finance Manager', 14, pageHeight - 10);
				doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
			}

			if (Capacitor.isNativePlatform()) {
				const pdfBase64 = doc.output('datauristring').split(',')[1];
				const fileName = `CostPilot_Report_${new Date().toISOString().split('T')[0]}.pdf`;

				const savedFile = await Filesystem.writeFile({
					path: fileName,
					data: pdfBase64,
					directory: Directory.Cache
				});

				await Share.share({
					title: 'Export PDF',
					text: 'Your CostPilot financial report.',
					url: savedFile.uri,
					dialogTitle: 'Share PDF'
				});
			} else {
				doc.save(`CostPilot_Report_${new Date().toISOString().split('T')[0]}.pdf`);
			}
		} catch (error) {
			console.error('PDF Export Error:', error);
			alert('Failed to generate PDF. Please check console for details.');
		}
	};

	const handleExportCSV = async () => {
		try {
			let filteredTransactions = transactions;
			if (startDate || endDate) {
				filteredTransactions = transactions.filter(t => {
					const tDate = t.date;
					const afterStart = !startDate || tDate >= startDate;
					const beforeEnd = !endDate || tDate <= endDate;
					return afterStart && beforeEnd;
				});
			}

			if (filteredTransactions.length === 0) {
				alert('No transactions found to export.');
				return;
			}

			const headers = ['Date', 'Title', 'Type', 'Amount', 'Currency', 'Location'];
			const rows = filteredTransactions.map(t => {
				const safeTitle = (t.title || '').replace(/"/g, '""');
				const safeLocation = (t.location || '').replace(/"/g, '""');

				return [
					t.date,
					`"${safeTitle}"`,
					t.type,
					t.amount,
					currency,
					`"${safeLocation}"`
				];
			});

			const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
			if (Capacitor.isNativePlatform()) {
				const fileName = `CostPilot_Export_${new Date().toISOString().split('T')[0]}.csv`;
				const base64Data = btoa(unescape(encodeURIComponent(csvContent)));

				const savedFile = await Filesystem.writeFile({
					path: fileName,
					data: base64Data,
					directory: Directory.Cache
				});

				await Share.share({
					title: 'Export CSV',
					text: 'Your CostPilot financial export.',
					url: savedFile.uri,
					dialogTitle: 'Share CSV'
				});
			} else {
				const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
				const url = URL.createObjectURL(blob);

				const link = document.createElement('a');
				link.href = url;
				link.download = `CostPilot_Export_${new Date().toISOString().split('T')[0]}.csv`;

				document.body.appendChild(link);
				link.click();

				setTimeout(() => {
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				}, 100);
			}
		} catch (error) {
			console.error('CSV Export Error:', error);
			alert('Failed to generate CSV. Please check console for details.');
		}
	};

	// Auto backup handlers
	const checkForTodayBackupConflict = async () => {
		try {
			const file = await getMostRecentBackup();
			if (file) {
				const filename = file.name;
				// Use local date for matching filename
				const now = new Date();
				const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
				
				if (filename.includes(today)) {
					const metadata = await parseBackupFile(file);
					setBackupMetadata({
						transactions: metadata.transactions?.length,
						categories: metadata.categories?.length
					});
					setShowOverwriteConfirm(true);
					return true;
				}
			}
		} catch (e) {
			console.error('Failed to check for backup conflict:', e);
		}
		return false;
	};

	const handleToggleBackup = async () => {
		if (!isEnabled) {
			// Turning ON
			if (!hasDirectoryAccess) {
				const granted = await requestDirectoryAccess();
				if (!granted) return;
			}

			// Check for conflict before final enable
			const hasConflict = await checkForTodayBackupConflict();
			if (!hasConflict) {
				enableBackup();
			}
		} else {
			// Turning OFF
			disableBackup();
		}
	};

	const onLocationClick = async () => {
		const granted = await requestDirectoryAccess();
		if (granted && isEnabled) {
			// If already enabled, check if the new location has a conflict
			await checkForTodayBackupConflict();
		}
	};

	const onRestoreClick = async () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e: any) => {
			const file = e.target.files?.[0];
			if (file) {
				const stats = await restoreFromBackup(file);
				if (stats && typeof stats === 'object') {
					setMergedEntries(stats.newTransactions || []);
					setShowMergedModal(true);
				}
			}
		};
		input.click();
	};

	const ManualModal = () => (
		<ConfirmModal
			isOpen={showManual}
			onClose={() => setShowManual(false)}
			onConfirm={() => setShowManual(false)}
			title="Backup Guidance"
			message="Choose the right way to manage your data."
			confirmLabel="Got it"
			variant="primary"
			extraContent={
				<div className="space-y-4 mt-6 text-left">
					{/* Merging Card */}
					<div className="card-section p-4 bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10 text-left">
						<div className="flex gap-4">
							<div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
								<span className="material-symbols-outlined">call_merge</span>
							</div>
							<div className="text-left">
								<h4 className="font-bold text-stone-800 dark:text-stone-100 text-sm text-left">Merging Data</h4>
								<p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed text-left">
									Click <span className="font-bold text-emerald-600 dark:text-emerald-400">Restore</span> and select a file to combine backup data with your device data.
								</p>
							</div>
						</div>
					</div>

					{/* Overwriting Card */}
					<div className="card-section p-4 bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10 text-left">
						<div className="flex gap-4">
							<div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
								<span className="material-symbols-outlined">swap_horiz</span>
							</div>
							<div className="text-left">
								<h4 className="font-bold text-stone-800 dark:text-stone-100 text-sm text-left">Overwriting Data</h4>
								<p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed text-left">
									Enabling auto-backup overwrites today's file. To avoid data loss, <span className="font-bold text-amber-600 dark:text-amber-400">move/rename</span> the existing file first, then use <span className="font-bold text-amber-600 dark:text-amber-400">Restore</span> to merge it later if needed.
								</p>
							</div>
						</div>
					</div>
				</div>
			}
		/>
	);

	const MergedResultsModal = () => {
		const symbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

		return (
			<ConfirmModal
				isOpen={showMergedModal}
				onClose={() => { setShowMergedModal(false); window.dispatchEvent(new Event('costpilot-settings-updated')); }}
				onConfirm={() => { setShowMergedModal(false); window.dispatchEvent(new Event('costpilot-settings-updated')); }}
				title="Sync Complete"
				message={`Found ${mergedEntries.length} new items in your backup.`}
				confirmLabel="Done"
				variant="primary"
				extraContent={
					<div className="max-h-96 overflow-y-auto space-y-2 mt-6 px-1 custom-scrollbar">
						{mergedEntries.map((t, i) => (
							<div
								key={i}
								className="w-full card p-3 md:p-4 flex items-center gap-3 md:gap-4 border border-[#AF8F42]/30 dark:border-[#AF8F42]/40 transition-all duration-500 ease-out text-left"
							>
								<div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
									}`}>
									<span className="material-symbols-outlined text-2xl">{t.type === 'income' ? 'trending_up' : 'payments'}</span>
								</div>
								<div className="flex-1 text-left min-w-0">
									<p className="font-bold text-stone-900 dark:text-white truncate tracking-tight">{t.title || 'Untitled'}</p>
									<div className="flex flex-col mt-0.5">
										<span className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>{t.type}</span>
										<span className="text-[9px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider leading-none mt-1">
											{formatDate(t.date)}
										</span>
									</div>
								</div>
								<div className={`font-bold text-base md:text-lg ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-white'}`}>
									{t.type === 'income' ? '+' : '-'}{symbol}{t.amount.toLocaleString()}
								</div>
							</div>
						))}
						{mergedEntries.length === 0 && (
							<div className="text-center py-12 card border-dashed border-stone-200 dark:border-stone-800">
								<div className="size-16 bg-stone-50 dark:bg-stone-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="material-symbols-outlined text-stone-300 text-3xl">cloud_done</span>
								</div>
								<p className="text-stone-400 text-sm font-medium">All items were already synced!</p>
							</div>
						)}
					</div>
				}
			/>
		);
	};


	return (
		<div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<div className="flex items-center justify-between px-1">
				<div>
					<h2 className="text-2xl font-bold font-brand-title brand-gradient">Settings</h2>
					<p className="text-stone-400 text-xs">Manage your preferences and data.</p>
				</div>
			</div>

			<div className="space-y-5">
				{/* Theme Highlight Card */}
				<div className="card-section p-5 relative overflow-hidden group border border-[#AF8F42]/30 dark:border-[#AF8F42]/40 bg-gradient-to-r from-stone-50 to-white dark:from-stone-900/50 dark:to-stone-900/20">
					<div className="absolute -top-10 -right-10 size-32 bg-gradient-to-br from-[#AF8F42] to-[#D4AF37] opacity-15 rounded-full blur-2xl group-hover:opacity-25 transition-opacity duration-700"></div>
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
						<div className="flex items-center gap-3 text-left w-full sm:w-auto">
							<div className="size-10 rounded-xl bg-[#AF8F42]/10 flex items-center justify-center text-[#AF8F42] shrink-0">
								<span className="material-symbols-outlined">{isDark ? 'dark_mode' : 'light_mode'}</span>
							</div>
							<div>
								<h3 className="font-bold text-stone-900 dark:text-white text-sm">App Appearance</h3>
								<p className="text-stone-400 text-[11px] mt-0.5">Switch between dark mode and light mode.</p>
							</div>
						</div>
						
						<button
							onClick={toggleDarkMode}
							className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#AF8F42] to-[#D4AF37] hover:from-[#c2a153] hover:to-[#e6c24c] text-stone-950 font-bold shadow-lg shadow-[#AF8F42]/20 hover:shadow-[#AF8F42]/30 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group shrink-0"
						>
							<span className="material-symbols-outlined text-lg animate-pulse">
								{isDark ? 'light_mode' : 'dark_mode'}
							</span>
							<span>Switch to {isDark ? 'Light' : 'Dark'} Mode</span>
						</button>
					</div>
				</div>

				{/* Data Exports */}
				<div className="card-section p-4 space-y-4 md:col-span-2">
					<div>
						<p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Data Management</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
							<DatePicker
								label="Start Date"
								value={startDate}
								onChange={setStartDate}
							/>
							<DatePicker
								label="End Date"
								value={endDate}
								onChange={setEndDate}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<button onClick={handleExportPDF} className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-2">
							<span className="material-symbols-outlined text-sm">picture_as_pdf</span>
							PDF
						</button>
						<button onClick={handleExportCSV} className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-2">
							<span className="material-symbols-outlined text-sm">description</span>
							CSV
						</button>
					</div>
				</div>
			</div>

			{/* Local Rolling Backup Card */}
			<div className="card-section p-6 bg-stone-900 text-white dark:bg-brand-surface-dark relative overflow-hidden group">
				<div className="absolute bottom-0 right-0 w-64 h-64 bg-[#AF8F42]/10 rounded-full -mb-32 -mr-32 blur-3xl group-hover:bg-[#AF8F42]/20 transition-all"></div>
				<div className="relative z-10">
					<div className="flex items-start gap-3 mb-4">
						<span className={`material-symbols-outlined text-2xl ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`}>
							{statusConfig.icon}
						</span>
						<div>
							<h3 className="text-base sm:text-xl font-bold">Rolling Local Backup</h3>
							<p className="text-stone-400 text-xs mt-1">Daily backups, 30 days retention.</p>
						</div>
					</div>

					{!Capacitor.isNativePlatform() && !(window as any).showDirectoryPicker && (
						<div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs p-3 rounded-xl">
							<span className="material-symbols-outlined text-sm inline-block align-text-bottom mr-1">warning</span>
							Scheduled auto-backup is only supported in Chromium browsers (Chrome, Edge). On this browser, you must backup manually.
						</div>
					)}

					<div className="flex items-center justify-between">
						<span className={`${statusConfig.color} font-bold text-sm`}>{statusConfig.text}</span>
						<div className="flex items-center gap-3">
							{isEnabled && lastBackupTime && backupStatus !== 'syncing' && (
								<span className="text-stone-400 text-xs truncate">Last: {formatLastBackup(lastBackupTime)}</span>
							)}
							<button
								onClick={handleToggleBackup}
								className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${isEnabled ? 'bg-[#AF8F42]' : 'bg-stone-600'
									}`}
								title={isEnabled ? 'Disable auto backup' : 'Enable auto backup'}
							>
								<span
									className={`inline-block size-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-1'
										}`}
								/>
							</button>
						</div>
					</div>

					{isEnabled && (
						<div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<button
									onClick={onLocationClick}
									className="flex items-center gap-2.5 bg-stone-800/80 rounded-lg p-2.5 border border-stone-700 min-w-0 text-left"
									title="Change Backup Location"
								>
									<div className="p-1.5 bg-stone-700 rounded-md text-stone-300 flex items-center justify-center shrink-0">
										<span className="material-symbols-outlined text-lg">folder_open</span>
									</div>
									<div className="flex flex-col min-w-0 flex-1">
										<span className="text-[10px] uppercase text-stone-500 font-bold tracking-widest leading-none">Location</span>
										<span className="text-xs text-stone-300 truncate font-mono mt-0.5">
											{directoryName || 'Not set'}
										</span>
									</div>
								</button>

								<div
									onClick={() => timePickerRef.current?.open()}
									className="flex items-center gap-2.5 bg-stone-800/80 rounded-lg p-2.5 border border-stone-700 min-w-0 text-left cursor-pointer"
									role="button"
									title="Change Backup Time"
								>
									<div className="p-1.5 bg-stone-700 rounded-md text-stone-300 flex items-center justify-center shrink-0">
										<span className="material-symbols-outlined text-lg">schedule</span>
									</div>
									<div className="flex flex-col min-w-0 flex-1">
										<span className="text-[10px] uppercase text-stone-500 font-bold tracking-widest leading-none">Time</span>
										<div className="mt-0.5">
											<TimePicker
												ref={timePickerRef}
												value={backupTime}
												onChange={setBackupTime}
											/>
										</div>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<button
									onClick={performManualBackup}
									disabled={backupStatus === 'syncing' || !hasDirectoryAccess || transactions.length === 0}
									className="bg-[#AF8F42] hover:bg-[#917536] disabled:bg-[#AF8F42]/50 text-white py-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm disabled:cursor-not-allowed"
									title={transactions.length === 0 ? "No data to backup" : ""}
								>
									<span className="material-symbols-outlined text-sm">save</span>
									Backup
								</button>

								<button
									onClick={onRestoreClick}
									className="bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
								>
									<span className="material-symbols-outlined text-sm">restore</span>
									Restore
								</button>
							</div>
						</div>
					)}
				</div>
			</div>


			<ConfirmModal
				isOpen={showOverwriteConfirm}
				onClose={() => {
					setShowOverwriteConfirm(false);
					setBackupMetadata(null);
				}}
				onConfirm={async () => {
					enableBackup();
					setShowOverwriteConfirm(false);
					setBackupMetadata(null);
				}}
				title="Today's Backup Will Be Overwritten"
				message={`A backup from today already exists in this folder. Enabling auto-backup will overwrite it with your current device data.`}
				confirmLabel="Overwrite & Enable"
				cancelLabel="Cancel"
				variant="danger"
				extraContent={
					<button 
						onClick={(e) => { e.stopPropagation(); setShowManual(true); }}
						className="text-xs font-bold text-rose-600 hover:underline"
					>
						How to merge or avoid overwriting?
					</button>
				}
			/>

			<ConfirmModal
				isOpen={showRestoreConfirm}
				onClose={() => {
					setShowRestoreConfirm(false);
					setRecentBackupFile(null);
					enableBackup();
				}}
				onConfirm={async () => {
					if (recentBackupFile) {
						const stats = await restoreFromBackup(recentBackupFile);
						if (stats && typeof stats === 'object') {
							setMergedEntries(stats.newTransactions || []);
							setShowMergedModal(true);
						}
					}
					setShowRestoreConfirm(false);
					setRecentBackupFile(null);
				}}
				title="Existing Backup Found"
				message="We found an existing CostPilot backup file. To combine its contents with your current data, choose 'Merge & Restore'. This will not overwrite your local updates."
				confirmLabel="Merge & Restore"
				cancelLabel="Not Now"
				variant="primary"
				extraContent={
					<button 
						onClick={(e) => { e.stopPropagation(); setShowManual(true); }}
						className="text-xs font-bold text-primary-600 hover:underline"
					>
						How backup merging works?
					</button>
				}
			/>
			<ManualModal />
			<MergedResultsModal />
		</div>
	);
};

export default Settings;
