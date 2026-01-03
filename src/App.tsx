import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import Tesseract from 'tesseract.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Sparkles,
  Trash2,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Settings,
  Upload,
  Download,
  FileUp,
  Utensils,

  Car,
  Package,
  Users,
  HeartPulse,
  Home,
  Palmtree,
  GraduationCap,
  CreditCard,
  Phone,
  PlayCircle,
  Briefcase,
  Coins,
  ShoppingBag,
  MoreHorizontal,
  Image as ImageIcon,
  LayoutGrid
} from 'lucide-react';
import './index.css';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note: string;
  refNo?: string; // Reference number for better duplicate check
  receiverName?: string; // Stored receiver name for behavior learning
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('bento-transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'สวัสดีครับ! พิมพ์บอกรายการรายรับรายจ่ายได้เลย เช่น "กินข้าว 60 บาท" หรือ "เงินเดือนเข้า 20000"', sender: 'bot' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [theme, setTheme] = useState<'glass' | 'oled' | 'neon' | 'neon-orange' | 'neon-blue' | 'neon-red' | 'bento-color'>(() => {
    return (localStorage.getItem('bento-theme') as any) || 'glass';
  });

  // User Behavior Learning State
  const [categoryPreferences, setCategoryPreferences] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('bento-category-prefs');
    return saved ? JSON.parse(saved) : {};
  });

  // Scanning States
  const [isScanning, setIsScanning] = useState(false);
  const [scanQueue, setScanQueue] = useState<string[]>([]);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [scanResults, setScanResults] = useState<Transaction[]>([]);
  const [scanSummary, setScanSummary] = useState<{ count: number, total: number }>({ count: 0, total: 0 });

  const [blur, setBlur] = useState<number>(() => parseInt(localStorage.getItem('glass-blur') || '20'));
  const [opacity, setOpacity] = useState<number>(() => parseInt(localStorage.getItem('glass-opacity') || '15'));
  const [bgImage, setBgImage] = useState<string>(() => localStorage.getItem('glass-bg') || '');
  const [bgBlur, setBgBlur] = useState<number>(() => parseInt(localStorage.getItem('glass-bg-blur') || '0'));
  const [bgDim, setBgDim] = useState<number>(() => parseInt(localStorage.getItem('glass-bg-dim') || '100'));
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isBottomThemeDropdownOpen, setIsBottomThemeDropdownOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  const exportToCSV = () => {
    if (transactions.length === 0) {
      alert('ไม่มีข้อมูลให้ส่งออกครับ');
      return;
    }
    // Headers for CSV
    const headers = ['id', 'date', 'category', 'note', 'type', 'amount'];

    // Create CSV content (using standard format for easier re-import)
    const csvRows = transactions.map(tx => {
      return [
        tx.id,
        tx.date,
        `"${tx.category.replace(/"/g, '""')}"`,
        `"${tx.note.replace(/"/g, '""')}"`,
        tx.type,
        tx.amount
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bento_backup_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const imported = JSON.parse(text);
          if (Array.isArray(imported)) {
            setTransactions([...imported, ...transactions].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
            alert('นำเข้าข้อมูลเรียบร้อยแล้วครับ');
          }
        } else if (file.name.endsWith('.csv')) {
          // Simple CSV Parser
          const lines = text.split('\n').filter(l => l.trim());
          // Using line 0 to validate headers if needed, but for now just skip it


          const importedTx: Transaction[] = lines.slice(1).map(line => {
            // Regex to handle quoted values with commas
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!values || values.length < 6) return null;

            const clean = (val: string) => val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1).replace(/""/g, '"') : val;

            return {
              id: clean(values[0]),
              date: clean(values[1]),
              category: clean(values[2]),
              note: clean(values[3]),
              type: clean(values[4]) as 'income' | 'expense',
              amount: parseFloat(clean(values[5])) || 0
            };
          }).filter(t => t !== null) as Transaction[];

          if (importedTx.length > 0) {
            // Merge and remove duplicates by ID
            const merged = [...importedTx, ...transactions];
            const unique = merged.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setTransactions(unique);
            alert(`นำเข้าข้อมูล ${importedTx.length} รายการเรียบร้อยแล้วครับ`);
          }
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการนำเข้าไฟล์ครับ');
        console.error(err);
      }
      if (importFileRef.current) importFileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    localStorage.setItem('bento-transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('bento-theme', theme);
    document.body.classList.remove('theme-oled', 'theme-neon', 'theme-neon-orange', 'theme-neon-blue', 'theme-neon-red', 'theme-bento-color');
    if (theme !== 'glass') document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--user-blur', `${blur}px`);
    root.style.setProperty('--user-opacity', `${opacity / 100}`);
    root.style.setProperty('--user-bg', bgImage ? `url(${bgImage})` : 'none');
    root.style.setProperty('--user-bg-blur', `${bgBlur}px`);
    root.style.setProperty('--user-bg-dim', `${bgDim / 100}`);

    try {
      localStorage.setItem('glass-blur', blur.toString());
      localStorage.setItem('glass-opacity', opacity.toString());
      localStorage.setItem('glass-bg', bgImage);
      localStorage.setItem('glass-bg-blur', bgBlur.toString());
      localStorage.setItem('glass-bg-dim', bgDim.toString());
    } catch (e) {
      console.warn('Storage limit reached');
    }
  }, [blur, opacity, bgImage, bgBlur, bgDim]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If any dropdown is open, and we click something
      if (isThemeDropdownOpen || isBottomThemeDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.theme-dropdown') && !target.closest('.action-btn')) {
          setIsThemeDropdownOpen(false);
          setIsBottomThemeDropdownOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeDropdownOpen, isBottomThemeDropdownOpen]);

  useEffect(() => {
    localStorage.setItem('bento-category-prefs', JSON.stringify(categoryPreferences));
  }, [categoryPreferences]);

  // Auto-Save when ending with "บาท"
  useEffect(() => {
    const trimmedInput = chatInput.trim();
    if (trimmedInput.endsWith('บาท') && trimmedInput.length > 3) {
      const timer = setTimeout(() => {
        if (chatInput.trim().endsWith('บาท')) {
          handleSendMessage();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [chatInput]);

  const totalBalance = transactions.reduce((acc, curr) =>
    curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const extractReceiver = (text: string): string | null => {
    // Helper to strip branch codes (3-5 digits) and extra spaces
    const clean = (name: string) => {
      return name.replace(/\b\d{3,5}\b/g, '') // Remove sequences like 0099
        .replace(/\s+/g, ' ')       // Collapse extra spaces
        .trim();
    };

    // 1. Try explicit "To" patterns first (Highest Priority)
    const toPatterns = [
      /ไปยัง\s*([ก-๙a-zA-Z0-9\s\.\/\-\(\)#]+?)(?:\s|$|บัญชี|เลขที่|Biller)/,
      /To\s*([ก-๙a-zA-Z0-9\s\.\/\-\(\)#]+?)(?:\s|$|Account|Number|Biller)/,
      /รับเงินโดย\s*([ก-๙a-zA-Z0-9\s\.\/\-\(\)#]+?)(?:\s|$)/,
      /Transfer to\s*([ก-๙a-zA-Z0-9\s\.\/\-\(\)#]+?)(?:\s|$)/,
      /ชำระค่า\s*([ก-๙a-zA-Z0-9\s\.\/\-\(\)#]+?)(?:\s|$)/,
      /จ่ายบิล\s*([ก-๙a-zA-Z0-9\s\.\/\-\(\)#]+?)(?:\s|สำเร็จ|$)/
    ];

    for (const pattern of toPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 2 && !['ออมทรัพย์', 'Savings', 'Account', 'Bank'].includes(name)) {
          return clean(name);
        }
      }
    }

    // 2. Identify Sender vs Receiver areas by looking for masked account numbers
    // In full slips (KBank, Krungsri, SCB), the first account is usually sender, second is receiver
    const accountRegex = /[X\d]{3}-[X\d]-[X\d]{5}-[X\d]|[X\d]{3}-[X\d]{1,2}-[X\d]{4,6}-[X\d]/g;
    const accountMatches = Array.from(text.matchAll(accountRegex));

    if (accountMatches.length >= 2) {
      // Look for the name ABOVE the SECOND account (the receiver)
      const secondAccountIndex = accountMatches[1].index || 0;
      const textBeforeSecondAccount = text.substring(0, secondAccountIndex);
      const linesBefore = textBeforeSecondAccount.split(/[\n\r]+/);

      // The name should be one of the last few lines before the account
      for (let i = linesBefore.length - 1; i >= 0; i--) {
        const line = linesBefore[i].trim();
        // Ignore lines that look like headers or specific keywords
        if (line.length > 2 && !['ไปยัง', 'To', 'โอนเงิน', 'เงินสด', 'สำเร็จ'].some(k => line.includes(k))) {
          return clean(line);
        }
      }
    }

    // 3. Fallback: Generic name above any account, but skip the very beginning of the slip
    const nameMatch = text.match(/([ก-๙a-zA-Z\s\.\/]+)\s*[\n\r]+\s*[X\d]{3}-[X\d]-[X\d]{5}-[X\d]/);
    if (nameMatch && text.indexOf(nameMatch[0]) > 50) {
      return clean(nameMatch[1]);
    }

    // 4. SCB specific biller/merchant fallback
    const billerMatch = text.match(/ไปยัง\s*[:\s]*([ก-๙a-zA-Z0-9\s\.]+?)\s+Biller ID/);
    if (billerMatch) return clean(billerMatch[1]);

    return null;
  };

  const extractRefNo = (text: string): string | null => {
    // Patterns for Ref No: usually a long string of numbers/letters after specific keywords
    const patterns = [
      /(?:เลขที่อ้างอิง|Ref(?:\.|\s)?No|Transaction ID|เลขที่รายการ|รหัสอ้างอิง)[:\s]*([A-Z0-9]{10,})/i,
      /(\d{10,30})/ // Fallback to any long sequence of numbers
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  };

  const extractDate = (text: string): string | null => {
    // 1. Check for DD/MM/YYYY format: 01/01/2026 (Very common in KTC/digital slips)
    const slashDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const slashMatch = text.match(slashDatePattern);
    if (slashMatch) {
      let day = slashMatch[1].padStart(2, '0');
      let month = slashMatch[2].padStart(2, '0');
      let year = parseInt(slashMatch[3]);
      if (year < 2400) year += 543; // Convert AD to BE for display consistency
      return `${day}/${month}/${year}`;
    }

    // Thai Month Mapping
    const thMonths: { [key: string]: string } = {
      'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04', 'พ.ค.': '05', 'มิ.ย.': '06',
      'ก.ค.': '07', 'ส.ค.': '08', 'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12',
      'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04', 'พฤษภาคม': '05', 'มิถุนายน': '06',
      'กรกฎาคม': '07', 'สิงหาคม': '08', 'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12'
    };

    // 2. Check for Thai format: 12 ม.ค. 67 or 12 มกราคม 2567
    // Improved regex to only match known Thai months
    const thDaysPattern = '(\\d{1,2})';
    const thMonthsPattern = '(' + Object.keys(thMonths).join('|').replace(/\./g, '\\.') + ')';
    const thYearsPattern = '(\\d{2,4})';
    const thDateRegex = new RegExp(`${thDaysPattern}\\s*${thMonthsPattern}\\s*${thYearsPattern}`, 'i');

    const thMatch = text.match(thDateRegex);
    if (thMatch) {
      let day = thMatch[1].padStart(2, '0');
      let month = thMonths[thMatch[2]] || '01';
      let year = parseInt(thMatch[3]);
      if (year < 100) year += 2500; // Handle 67 -> 2567
      else if (year < 2400) year += 543; // Handle 2024 -> 2567
      return `${day}/${month}/${year}`;
    }

    // English Month Mapping
    const enMonths: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    // 3. Check for English format: 12 Jan 2024
    const enDatePattern = /(\d{1,2})\s*([a-zA-Z]{3,})\s*(\d{2,4})/;
    const enMatch = text.match(enDatePattern);
    if (enMatch) {
      let shortMonth = enMatch[2].substring(0, 3);
      if (enMonths[shortMonth]) {
        let day = enMatch[1].padStart(2, '0');
        let month = enMonths[shortMonth];
        let year = parseInt(enMatch[3]);
        if (year < 100) year += 2000;
        return `${day}/${month}/${year + 543}`;
      }
    }

    return null;
  };

  const getCategoryFromText = (text: string, type: 'income' | 'expense', receiver?: string | null) => {
    if (type === 'income') return 'รายได้';

    // 1. Check User Preferences first
    if (receiver && categoryPreferences[receiver]) {
      console.log(`Using user preference for ${receiver}: ${categoryPreferences[receiver]}`);
      return categoryPreferences[receiver];
    }

    // Weighted Category Mapping
    const categoryMap: { [key: string]: { keywords: string[], weight: number } } = {
      'อาหารและเครื่องดื่ม': {
        keywords: ['กิน', 'ทอด', 'ย่าง', 'ปิ้ง', 'ข้าว', 'น้ำ', 'กาแฟ', 'อร่อย', 'ชา', 'ขนม', 'ส้มตำ', 'ก๋วยเตี๋ยว', 'บุฟเฟต์', 'บุฟเฟ่ต์', 'มื้อ', 'อาหาร', 'ค่าอาหาร', 'GrabFood', 'Lineman', 'Foodpanda', 'ShopeeFood', 'เซเว่น', 'คาเฟ่', 'KFC', 'McDonald', 'Starbucks'],
        weight: 1.2
      },
      'การเดินทาง': {
        keywords: ['รถ', 'น้ำมัน', 'วิน', 'แท็กซี่', 'BTS', 'MRT', 'เรือ', 'ตั๋วเครื่องบิน', 'ทางด่วน', 'ที่จอดรถ', 'GrabCar', 'Bolt', 'ล้างรถ', 'ซ่อมรถ', 'ปั๊ม', 'เติมน้ำมัน', 'PT', 'TOYOTA', 'Shell', 'Bangchak', 'PTT', 'CALTEX', 'Esso', 'Susco'],
        weight: 1.2
      },
      'ของใช้จำเป็น': {
        keywords: ['ทิชชู่', 'สบู่', 'ยาสีฟัน', 'ผงซักฟอก', 'ของแห้ง', 'ตลาด', 'ซุปเปอร์', 'ของใช้ส่วนตัว', 'ผ้าอนามัย', 'แชมพู', 'โลตัส', 'บิ๊กซี', 'Lotus', 'LOTUS', 'BigC', 'BIGC', 'Watson', 'CJ', '7-Eleven', 'CP FreshMart'],
        weight: 1.0
      },
      'สุขภาพ': {
        keywords: ['ยา', 'หมอ', 'โรงพยาบาล', 'คลินิก', 'วิตามิน', 'หมอฟัน', 'หาหมอ', 'ฟิตเนส', 'แว่นตา', 'ตรวจสุขภาพ', 'Pharmacy', 'Health', 'Allianz', 'AIA', 'FWD', 'Prudential', 'LIFE', 'ประกัน', 'MSIG', 'Insurance', 'KGIB'],
        weight: 1.5 // Health keywords are usually very specific
      },
      'สินเชื่อ บัตรเครดิต': {
        keywords: [
          'บัตรเครดิต', 'สินเชื่อ', 'งวด', 'ดอกเบี้ย', 'จ่ายบัตร', 'กรุงศรีเฟิร์สช้อยส์', 'KTC', 'กู้', 'ผ่อนรถ', 'ผ่อนบ้าน', 'ส่งบ้าน', 'ค่าบ้าน', 'Credit Card', 'Loan', 'Leasing',
          'เฟิร์สช้อยส์', 'First Choice', 'Central The 1', 'เซ็นทรัล เดอะวัน', 'เดอะวัน', 'Krungsri', 'โอน:ธุรกิจ'
        ],
        weight: 1.4
      },
      'บันเทิง': {
        keywords: ['ดูหนัง', 'คอนเสิร์ต', 'เกม', 'เติมเกม', 'ปาร์ตี้', 'เหล้า', 'เบียร์', 'คาราโอเกะ', 'Netflix', 'Spotify', 'Youtube Premium', 'Cinema', 'แพคเก็จ'],
        weight: 1.1
      },
      'ช็อปปิ้ง': {
        keywords: ['ซื้อ', 'เสื้อ', 'กางเกง', 'รองเท้า', 'ของใช้', 'ห้าง', 'Lazada', 'Shopee', 'ลาซาด้า', 'ช้อปปี้', 'ชอปปี้', 'ไดโซะ', 'เครื่องสำอาง', 'น้ำหอม', 'Mall'],
        weight: 1.0
      },
      'สาธารณูปโภค': {
        keywords: ['การไฟฟ้า', 'การประปา', 'ค่าไฟ', 'ค่าน้ำ', 'MEA', 'PEA', 'MWA', 'PWA'],
        weight: 2.0 // Very specific
      }
    };

    let bestCategory = 'อื่นๆ';
    let maxScore = 0;

    for (const [cat, config] of Object.entries(categoryMap)) {
      let matches = 0;
      config.keywords.forEach(k => {
        if (text.toUpperCase().includes(k.toUpperCase())) {
          matches++;
        }
      });

      if (matches > 0) {
        const score = matches * config.weight;
        if (score > maxScore) {
          maxScore = score;
          bestCategory = cat;
        }
      }
    }

    return bestCategory;
  };

  const parseNaturalLanguage = (text: string) => {
    const amountMatch = text.match(/[\d,.]+/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
    if (amount === 0) return null;
    let type: 'income' | 'expense' = 'expense';

    // Expanded Thai Income Keywords for smarter recognition
    const incomeKeywords = [
      'เงินเดือน', 'ได้เงิน', 'เข้า', 'รายรับ', 'โอนเข้า', 'ถอนเงิน', 'ค่าคอม',
      'รับ', 'รับเงิน', 'ขาย', 'ขายของ', 'ขายได้', 'กำไร', 'โบนัส', 'ทิป',
      'ถูกหวย', 'สลาก', 'ปันผล', 'มรดก', 'คืนเงิน'
    ];

    if (incomeKeywords.some(k => text.includes(k))) type = 'income';

    // หมวด Extraction Logic
    let category = getCategoryFromText(text, type);
    const categoryMatch = text.match(/หมวด\s*([ก-๙a-zA-Z]+)/);
    if (categoryMatch) {
      const catKeyword = categoryMatch[1];
      const categoryMapping: { [key: string]: string } = {
        'อาหาร': 'อาหารและเครื่องดื่ม',
        'กิน': 'อาหารและเครื่องดื่ม',
        'ทอด': 'อาหารและเครื่องดื่ม',
        'ย่าง': 'อาหารและเครื่องดื่ม',
        'ปิ้ง': 'อาหารและเครื่องดื่ม',
        'เดินทาง': 'การเดินทาง',
        'รถ': 'การเดินทาง',
        'จำเป็น': 'ของใช้จำเป็น',
        'ใช้จ่าย': 'ของใช้จำเป็น',
        'สุขภาพ': 'สุขภาพ',
        'ยา': 'สุขภาพ',
        'หนี้': 'สินเชื่อ บัตรเครดิต',
        'บัตร': 'สินเชื่อ บัตรเครดิต',
        'บันเทิง': 'บันเทิง',
        'เกม': 'บันเทิง',
        'ช้อปปิ้ง': 'ช็อปปิ้ง',
        'ซื้อของ': 'ช็อปปิ้ง',
        'บ้าน': 'ของใช้ในบ้าน',
        'น้ำไฟ': 'สาธารณูปโภค'
      };

      // Search for the best match in the mapping
      for (const [key, val] of Object.entries(categoryMapping)) {
        if (catKeyword.includes(key)) {
          category = val;
          break;
        }
      }
    }

    // Fix: Escape the dot in 'บ.' to match literal 'บ.' and not wildcard any character
    // Also remove "หมวด <category>" from note
    let note = text.replace(/[\d,]+/g, '')
      .replace(/บาท|บ\./g, '')
      .replace(/หมวด\s*[ก-๙a-zA-Z]+/g, '')
      .trim();
    if (!note) note = type === 'income' ? 'รายรับเพิ่มขึ้น' : 'รายจ่ายใหม่';
    return { amount, type, note, category };
  };

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    // Clear immediately to prevent double-save and persistent text bug
    setChatInput('');

    const userMsg: Message = { id: Date.now().toString(), text: text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);

    const parsed = parseNaturalLanguage(text);
    if (parsed) {
      const newTx: Transaction = {
        id: (Date.now() + 1).toString(),
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        date: new Date().toLocaleDateString('th-TH'),
        note: parsed.note
      };
      setTransactions(prev => [newTx, ...prev]);

      const botMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: `บันทึก${parsed.type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${parsed.amount.toLocaleString()} บาท ใน ${parsed.category} แล้วครับ! ✅`,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
    } else {
      setMessages(prev => [...prev, { id: 'bot-err', text: 'ขอโทษครับ ลองพิมพ์เป็น "ค่าอาหาร 50" นะครับ', sender: 'bot' }]);
    }
  };

  const deleteTransaction = (id: string) => {
    if (confirm('ยืนยันการลบรายการนี้?')) setTransactions(transactions.filter(t => t.id !== id));
  };

  const updateTransaction = () => {
    if (!editingTx) return;

    // User Behavior Learning: if category changed and it's a slip-like transaction, save preference
    const originalTx = transactions.find(t => t.id === editingTx.id);
    if (originalTx && originalTx.category !== editingTx.category) {
      // Use stored receiverName if available, otherwise try to extract from note
      const receiver = originalTx.receiverName ||
        (originalTx.note.includes('สลิป') ? extractReceiver(originalTx.note) :
          (!['โอนเงิน', 'ซื้อสลากดิจิทัล'].includes(originalTx.note) ? originalTx.note : null));

      if (receiver && receiver.length > 2) {
        setCategoryPreferences(prev => ({ ...prev, [receiver]: editingTx.category }));
      }
    }

    setTransactions(transactions.map(t => t.id === editingTx.id ? editingTx : t));
    setEditingTx(null);
  };

  const toggleTheme = () => {
    setIsThemeDropdownOpen(!isThemeDropdownOpen);
  };

  const selectTheme = (newTheme: any) => {
    setTheme(newTheme);
    setIsThemeDropdownOpen(false);
    setIsBottomThemeDropdownOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('รูปภาพใหญ่เกินไปครับ (จำกัด 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setTempImage(base64String);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const saveCroppedImage = async () => {
    if (tempImage && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(tempImage, croppedAreaPixels);
      if (croppedImage) {
        setBgImage(croppedImage);
        setIsCropping(false);
        setTempImage(null);
      }
    }
  };

  // Slip Scanning Logic
  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newQueue: string[] = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        newQueue.push(result);
        if (newQueue.length === files.length) {
          setScanQueue(newQueue);
          setIsScanning(true);
          setCurrentScanIndex(0);
          setScanResults([]);
          processQueue(newQueue);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const processQueue = async (queue: string[]) => {
    let totalFoundCount = 0;
    let totalFoundAmount = 0;

    for (let i = 0; i < queue.length; i++) {
      setCurrentScanIndex(i);

      try {
        // Real OCR using Tesseract.js
        const { data: { text } } = await Tesseract.recognize(
          queue[i],
          'tha+eng', // Scan both Thai and English
          {
            // logger: m => console.log(m) 
          }
        );

        console.log("Scanned Text:", text);

        // 0. Detect Bank (Improved)
        let detectedBank = 'Unknown';
        if (text.includes('KASIKORNBANK') || text.includes('กสิกรไทย')) detectedBank = 'KBank';
        else if (text.includes('SCB') || text.includes('ไทยพาณิชย์')) detectedBank = 'SCB';
        else if (text.includes('Krungthai') || text.includes('กรุงไทย')) detectedBank = 'Krungthai';
        else if (text.includes('Bangkok Bank') || text.includes('กรุงเทพ')) detectedBank = 'BBL';
        else if (text.includes('Krungsri') || text.includes('บัตรเครดิต/สินเชื่อ')) detectedBank = 'Krungsri';

        // --- MULTI-TRANSACTION STATEMENT DETECTION ---
        const rowRegex = /([ก-๙a-zA-Z0-9_.\s\(\)-:/&']+?)\s+([\d,]+\.\d{2})\s*(?:บาท|THB|thb|บาก|บ|ฯ)?/gi;
        const multiTxFound: Transaction[] = [];
        let rowMatch;

        const simplifyMerchantName = (name: string) => {
          const upperName = name.toUpperCase();
          if (upperName.includes('PT ') || upperName.includes('PT.')) return 'เติมน้ำมัน PT';
          if (upperName.includes('SHELL')) return 'เติมน้ำมัน Shell';
          if (upperName.includes('BANGCHAK')) return 'เติมน้ำมัน บางจาก';
          if (upperName.includes('PTT')) return 'เติมน้ำมัน PTT';
          if (upperName.includes('CALTEX')) return 'เติมน้ำมัน Caltex';
          if (upperName.includes('ESSO')) return 'เติมน้ำมัน Esso';
          if (upperName.includes('TOYOTA')) return 'เช็ครถ TOYOTA';
          if (upperName.includes('ALLIANZ') || upperName.includes('KGIB')) return 'ประกัน Allianz';
          if (upperName.includes('MSIG')) return 'ประกัน MSIG';
          if (upperName.includes('BANGKOK LIFE')) return 'ประกัน Bangkok Life';
          if (upperName.includes('7-ELEVEN')) return '7-Eleven';
          if (upperName.includes('LOTUS\'S') || upperName.includes('LOTUS')) return 'Lotus';
          if (upperName.includes('BIGC')) return 'BigC';
          if (upperName.includes('WATSON')) return 'Watson';
          if (upperName.includes('CJ')) return 'CJ';
          if (upperName.includes('CP')) return 'CP';
          return name;
        };

        while ((rowMatch = rowRegex.exec(text)) !== null) {
          let rawName = rowMatch[1].trim();
          const rawAmount = parseFloat(rowMatch[2].replace(/,/g, ''));

          // Clean names of leading dates interleaved from OCR (e.g. "05 ธ.ค.")
          rawName = rawName.replace(/^\d{2}\s+[ก-๙]{1,3}\.?\s*/, '').trim();

          if (rawName.length < 3) continue;

          const category = getCategoryFromText(rawName, 'expense', rawName);
          const simplifiedName = simplifyMerchantName(rawName);

          multiTxFound.push({
            id: (Date.now() + Math.random()).toString(),
            amount: rawAmount,
            type: 'expense',
            category: category,
            date: extractDate(text) || new Date().toLocaleDateString('th-TH'),
            note: `${simplifiedName} (จ่ายบัตร)`,
            receiverName: rawName
          });
        }

        if (multiTxFound.length > 0) {
          setScanResults(prev => [...multiTxFound, ...prev]);
          totalFoundCount += multiTxFound.length;
          totalFoundAmount += multiTxFound.reduce((sum, tx) => sum + tx.amount, 0);
          setScanSummary({ count: totalFoundCount, total: totalFoundAmount });
          continue;
        }
        // --- END MULTI-TRANSACTION LOGIC ---

        // Improved Amount Extraction Logic
        let possibleAmounts: { val: number, score: number }[] = [];

        // Keywords that usually precede an amount
        const amountKeywords = ['ยอดชำระทั้งหมด', 'ยอดรวม', 'ยอดชำระ', 'จำนวนเงิน', 'amount', 'total', 'ชำระเงิน', 'paid amount', 'บาท'];

        // Bank-Specific keywords for amount
        if (detectedBank === 'KBank') amountKeywords.push('จำนวน:');
        if (detectedBank === 'SCB') amountKeywords.push('จำนวนเงิน (Baht)');

        // Units that usually follow an amount
        const units = ['บาท', 'baht', 'thb', '฿'];

        // 1. Scan for Keyword + Number patterns
        const keywordRegex = new RegExp(`(?:${amountKeywords.join('|')})\\s*[:\\-\\s]*([\\d,]+\\.?\\d*)`, 'i');
        const keywordMatch = text.match(keywordRegex);
        if (keywordMatch && keywordMatch[1]) {
          const val = parseFloat(keywordMatch[1].replace(/,/g, ''));
          if (val > 0) possibleAmounts.push({ val, score: 100 });
        }

        // 2. Scan for Number + Unit patterns
        const unitRegex = new RegExp(`([\\d,]+\\.?\\d*)\\s*(?:${units.join('|')})`, 'i');
        const unitMatch = text.match(unitRegex);
        if (unitMatch && unitMatch[1]) {
          const val = parseFloat(unitMatch[1].replace(/,/g, ''));
          if (val > 0) possibleAmounts.push({ val, score: 80 });
        }

        // 3. Fallback: Extract all numbers and score them
        const allNumbers = text.match(/\d+[\d,.]*/g);
        if (allNumbers) {
          allNumbers.forEach(n => {
            const raw = n.replace(/,/g, '');
            const val = parseFloat(raw);
            if (isNaN(val) || val <= 0 || val > 1000000) return;

            let score = 0;
            // High score for decimals (common in slips)
            if (raw.includes('.')) score += 30;
            // High score if near unit in original text
            if (new RegExp(`[\\d,.]+\\s*(?:${units.join('|')})`).test(text)) score += 20;

            // Check if this number is the one mentioned in the GLO slip format "240 บาท"
            // We already did unit scan, but let's add generalized scoring for numbers
            if (val < 10 && !raw.includes('.')) score -= 50;
            possibleAmounts.push({ val, score });
          });
        }

        // Sort by score (desc) and value (desc) to pick the best candidate
        possibleAmounts.sort((a, b) => b.score - a.score || b.val - a.val);

        // Pick the top amount if exists
        let amount = possibleAmounts.length > 0 ? possibleAmounts[0].val : 0;

        // Final sanity check: if we found a "บาท" match, it usually is the right one even if smaller than a wallet ID
        const bestUnitMatch = possibleAmounts.find(a => a.score >= 80);
        if (bestUnitMatch) amount = bestUnitMatch.val;

        // Detect Receiver
        const receiver = extractReceiver(text);
        if (receiver) {
          console.log("Detected Receiver:", receiver);
        }

        // 0.1 Detect Ref No
        const refNo = extractRefNo(text);
        if (refNo) {
          console.log("Detected Ref No:", refNo);
        }

        // 0.2 Detect Slip Date
        const slipDate = extractDate(text);
        if (slipDate) {
          console.log("Detected Slip Date:", slipDate);
        }

        // Real Category Detection from Text (passing receiver for behavior learning)
        const detectedCategory = getCategoryFromText(text, 'expense', receiver);

        // Smart Note Generation
        let note = receiver || `สแกนจากสลิป #${i + 1}`;
        if (!receiver) {
          if (text.includes('สลาก') || text.includes('GLO')) {
            note = 'ซื้อสลากดิจิทัล';
          } else if (text.includes('โอนเงิน') || text.includes('Transfer')) {
            note = 'โอนเงิน';
          }
        }

        if (amount === 0) note += ' (ไม่พบยอดเงิน)';

        const newTx: Transaction = {
          id: (Date.now() + i).toString(),
          amount: amount || 0,
          type: 'expense',
          category: detectedCategory,
          date: slipDate || new Date().toLocaleDateString('th-TH'),
          note: note,
          refNo: refNo || undefined,
          receiverName: receiver || undefined
        };

        // Duplicate Check: Ref No (Best) or Date + Amount + Category
        const isDuplicate = transactions.some(t => {
          if (newTx.refNo && t.refNo) {
            return t.refNo === newTx.refNo;
          }
          return t.amount === newTx.amount &&
            t.date === newTx.date &&
            t.category === newTx.category;
        });

        if (isDuplicate) {
          newTx.note = `[ซ้ำ?] ${newTx.note}`;
        }

        setScanResults(prev => [newTx, ...prev]);
        totalFoundCount++;
        totalFoundAmount += (amount || 0);
        setScanSummary({ count: totalFoundCount, total: totalFoundAmount });

      } catch (err) {
        console.error("OCR Error:", err);
        const newTx: Transaction = {
          id: (Date.now() + i).toString(),
          amount: 0,
          type: 'expense',
          category: 'อื่นๆ',
          date: new Date().toLocaleDateString('th-TH'),
          note: `สแกนจากสลิป #${i + 1} (ผิดพลาด)`
        };
        setScanResults(prev => [newTx, ...prev]);
      }
    }
  };

  const confirmScanResults = () => {
    setTransactions(prev => [...scanResults, ...prev]);
    setIsScanning(false);
    setScanQueue([]);
    setScanResults([]);
    alert(`บันทึกสำเร็จ ${scanResults.length} รายการ เรียบร้อยแล้วครับ!`);
  };

  const bgPresets = [
    '',
    // 🌈
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=1074',
    // 🌑
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1477332552946-cfb384aeaf1c?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000'
  ];

  const displayedTransactions = viewAll ? transactions : transactions.slice(0, 5);
  const cardClass = `bento-card ${theme === 'glass' ? 'glass' : ''}`;

  return (
    <>
      {isSettingsOpen && (
        <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-card" onClick={e => e.stopPropagation()}>
            <div className="setting-header">
              <h3 className="text-lg">Glass Customization</h3>
              <button className="action-btn" onClick={() => setIsSettingsOpen(false)}><X size={18} /></button>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="text-sm">Glass Blur (ตัวการ์ด)</label>
                <span className="text-xs">{blur}px</span>
              </div>
              <input type="range" min="0" max="40" value={blur} onChange={e => setBlur(parseInt(e.target.value))} />
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="text-sm">Glass Opacity (ความใส)</label>
                <span className="text-xs">{opacity}%</span>
              </div>
              <input type="range" min="0" max="80" value={opacity} onChange={e => setOpacity(parseInt(e.target.value))} />
            </div>

            <div style={{ padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="setting-item">
                <div className="setting-header">
                  <label className="text-sm">Wallpaper Blur (พื้นหลัง)</label>
                  <span className="text-xs">{bgBlur}px</span>
                </div>
                <input type="range" min="0" max="25" value={bgBlur} onChange={e => setBgBlur(parseInt(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="text-sm">Wallpaper Brightness (ความสว่าง)</label>
                  <span className="text-xs">{bgDim}%</span>
                </div>
                <input type="range" min="20" max="100" value={bgDim} onChange={e => setBgDim(parseInt(e.target.value))} />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-header" style={{ marginBottom: '8px' }}>
                <label className="text-sm">Background Preset</label>
                <button
                  className="action-btn"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '6px', border: '1px solid var(--accent-primary)', color: 'white' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> อัพโหลด
                </button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
              <div className="bg-presets">
                {bgPresets.map((bg, i) => (
                  <button
                    key={i}
                    className={`preset-btn ${bgImage === bg ? 'active' : ''}`}
                    style={{ backgroundImage: bg ? `url(${bg})` : 'none' }}
                    onClick={() => setBgImage(bg)}
                  >
                    {!bg && <X size={14} />}
                  </button>
                ))}
                {bgImage && !bgPresets.includes(bgImage) && (
                  <button
                    className="preset-btn active"
                    style={{ backgroundImage: `url(${bgImage})` }}
                    onClick={() => setBgImage(bgImage)}
                  />
                )}
              </div>
            </div>
            <div className="setting-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '10px' }}>
              <label className="text-sm" style={{ display: 'block', marginBottom: '12px' }}>จัดการข้อมูล</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="action-btn"
                  style={{ flex: 1, padding: '10px', height: 'auto', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={exportToCSV}
                >
                  <Download size={20} />
                  ส่งออกข้อมูล (CSV)
                </button>
                <button
                  className="action-btn"
                  style={{ flex: 1, padding: '10px', height: 'auto', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={() => importFileRef.current?.click()}
                >
                  <FileUp size={20} />
                  นำเข้าข้อมูล
                </button>
                <input
                  type="file"
                  ref={importFileRef}
                  hidden
                  accept=".csv,.json"
                  onChange={handleImportData}
                />
              </div>
            </div>
            <p className="text-xs" style={{ opacity: 0.5, fontStyle: 'italic' }}>* Settings only apply in Glass Mode</p>

          </div>
        </div>
      )}

      {isCropping && tempImage && (
        <div className="cropper-overlay">
          <div className="cropper-card">
            <div className="setting-header">
              <h3 className="text-lg">ตกแต่งรูปภาพ</h3>
              <button className="action-btn" onClick={() => setIsCropping(false)}><X size={18} /></button>
            </div>
            <div className="cropper-container">
              <Cropper
                image={tempImage}
                crop={crop}
                zoom={zoom}
                aspect={window.innerWidth / window.innerHeight}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="cropper-controls">
              <div className="setting-item" style={{ width: '100%', marginBottom: '20px' }}>
                <div className="setting-header">
                  <label className="text-sm">Zoom</label>
                  <span className="text-xs">{zoom}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button className="neon-btn secondary" style={{ flex: 1 }} onClick={() => setIsCropping(false)}>ยกเลิก</button>
                <button className="neon-btn primary" style={{ flex: 1 }} onClick={saveCroppedImage}>บันทึกพื้นหลัง</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="scanning-overlay">
          <div className="scanning-card">
            <div className="setting-header">
              <div>
                <h3 className="text-lg">AI Slip Scanning</h3>
                <p className="text-xs">กำลังวิเคราะห์รูปภาพที่ {currentScanIndex + 1}/{scanQueue.length}</p>
              </div>
              <button className="action-btn" onClick={() => setIsScanning(false)}><X size={18} /></button>
            </div>

            <div className="scan-visualizer">
              {scanQueue[currentScanIndex] && (
                <img src={scanQueue[currentScanIndex]} alt="scanning" className="scan-image-preview" />
              )}
              {currentScanIndex < scanQueue.length && <div className="scan-line"></div>}
            </div>

            <div className="scanning-status">
              {currentScanIndex < scanQueue.length - 1 || (currentScanIndex === scanQueue.length - 1 && scanResults.length < scanQueue.length) ? (
                <>
                  <div className="scanning-loader"></div>
                  <p className="text-sm">กำลังอ่านข้อมูลจากสลิป...</p>
                </>
              ) : (
                <div style={{ width: '100%' }}>
                  <p className="text-sm text-teal" style={{ marginBottom: '16px' }}>วิเคราะห์เสร็จสิ้น! พบทั้งหมด {scanResults.length} รายการ</p>

                  <div className="scan-results-list no-scrollbar">
                    {scanResults.map(tx => (
                      <div key={tx.id} className="scan-result-item">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                          <div>
                            <p className="text-xs" style={{ fontWeight: 600 }}>{tx.category}</p>
                            <p className="text-xs" style={{ opacity: 0.6 }}>{tx.note}</p>
                          </div>
                        </div>
                        <p className="text-sm" style={{ fontWeight: 700 }}>฿{tx.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-sm">ยอดรวมที่ตรวจพบ</span>
                    <span className="text-sm text-teal" style={{ fontWeight: 800 }}>฿{scanSummary.total.toLocaleString()}</span>
                  </div>

                  <button className="neon-btn primary" style={{ width: '100%', marginTop: '20px', height: '50px' }} onClick={confirmScanResults}>
                    ยืนยันการบันทึกข้อมูล
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fade-in">
        <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div>
            <h1 className="text-xl">Expense</h1>
            <p className="text-xs">Bento AI Assistant</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <button className={`action-btn ${isThemeDropdownOpen ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleTheme(); }} title="เปลี่ยนโหมด">
                {theme === 'glass' ? <Moon size={18} /> : theme === 'oled' ? <Sun size={18} /> : theme === 'bento-color' ? <LayoutGrid size={18} /> : <Sparkles size={18} />}
              </button>
              {isThemeDropdownOpen && (
                <div className="theme-dropdown" onClick={e => e.stopPropagation()}>
                  <button className={`dropdown-item ${(theme as string) === 'glass' ? 'active' : ''}`} onClick={() => selectTheme('glass')}><Moon size={16} /> Glass Mode</button>
                  <button className={`dropdown-item ${(theme as string) === 'oled' ? 'active' : ''}`} onClick={() => selectTheme('oled')}><Sun size={16} /> OLED Mode</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon' ? 'active' : ''}`} onClick={() => selectTheme('neon')}><Sparkles size={16} /> Neon Cyan</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon-orange' ? 'active' : ''}`} onClick={() => selectTheme('neon-orange')}><Sparkles size={16} /> Neon Orange</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon-blue' ? 'active' : ''}`} onClick={() => selectTheme('neon-blue')}><Sparkles size={16} /> Neon Blue</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon-red' ? 'active' : ''}`} onClick={() => selectTheme('neon-red')}><Sparkles size={16} /> Neon Red</button>
                  <button className={`dropdown-item ${(theme as string) === 'bento-color' ? 'active' : ''}`} onClick={() => selectTheme('bento-color')}><LayoutGrid size={16} /> Bento Color</button>
                </div>
              )}
            </div>
            <button className="action-btn" onClick={() => setIsSettingsOpen(true)} title="ตั้งค่ากระจก">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {isSettingsOpen && (
          <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="settings-card" onClick={e => e.stopPropagation()}>
              <div className="setting-header">
                <h3 className="text-lg">Glass Customization</h3>
                <button className="action-btn" onClick={() => setIsSettingsOpen(false)}><X size={18} /></button>
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="text-sm">Glass Blur (ตัวการ์ด)</label>
                  <span className="text-xs">{blur}px</span>
                </div>
                <input type="range" min="0" max="40" value={blur} onChange={e => setBlur(parseInt(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="text-sm">Glass Opacity (ความใส)</label>
                  <span className="text-xs">{opacity}%</span>
                </div>
                <input type="range" min="0" max="80" value={opacity} onChange={e => setOpacity(parseInt(e.target.value))} />
              </div>

              <div style={{ padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="setting-item">
                  <div className="setting-header">
                    <label className="text-sm">Wallpaper Blur (พื้นหลัง)</label>
                    <span className="text-xs">{bgBlur}px</span>
                  </div>
                  <input type="range" min="0" max="25" value={bgBlur} onChange={e => setBgBlur(parseInt(e.target.value))} />
                </div>

                <div className="setting-item">
                  <div className="setting-header">
                    <label className="text-sm">Wallpaper Brightness (ความสว่าง)</label>
                    <span className="text-xs">{bgDim}%</span>
                  </div>
                  <input type="range" min="20" max="100" value={bgDim} onChange={e => setBgDim(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-header" style={{ marginBottom: '8px' }}>
                  <label className="text-sm">Background Preset</label>
                  <button
                    className="action-btn"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '6px', border: '1px solid var(--accent-primary)', color: 'white' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} /> อัพโหลด
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
                </div>
                <div className="bg-presets">
                  {bgPresets.map((bg, i) => (
                    <button
                      key={i}
                      className={`preset-btn ${bgImage === bg ? 'active' : ''}`}
                      style={{ backgroundImage: bg ? `url(${bg})` : 'none' }}
                      onClick={() => setBgImage(bg)}
                    >
                      {!bg && <X size={14} />}
                    </button>
                  ))}
                  {bgImage && !bgPresets.includes(bgImage) && (
                    <button
                      className="preset-btn active"
                      style={{ backgroundImage: `url(${bgImage})` }}
                      onClick={() => setBgImage(bgImage)}
                    />
                  )}
                </div>
              </div>
              <div className="setting-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '10px' }}>
                <label className="text-sm" style={{ display: 'block', marginBottom: '12px' }}>จัดการข้อมูล</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="action-btn"
                    style={{ flex: 1, padding: '10px', height: 'auto', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.1)' }}
                    onClick={exportToCSV}
                  >
                    <Download size={20} />
                    ส่งออกข้อมูล (CSV)
                  </button>
                  <button
                    className="action-btn"
                    style={{ flex: 1, padding: '10px', height: 'auto', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.1)' }}
                    onClick={() => importFileRef.current?.click()}
                  >
                    <FileUp size={20} />
                    นำเข้าข้อมูล
                  </button>
                  <input
                    type="file"
                    ref={importFileRef}
                    hidden
                    accept=".csv,.json"
                    onChange={handleImportData}
                  />
                </div>
              </div>
              <p className="text-xs" style={{ opacity: 0.5, fontStyle: 'italic' }}>* Settings only apply in Glass Mode</p>

            </div>
          </div>
        )}

        {isCropping && tempImage && (
          <div className="cropper-overlay">
            <div className="cropper-card">
              <div className="setting-header">
                <h3 className="text-lg">ตกแต่งรูปภาพ</h3>
                <button className="action-btn" onClick={() => setIsCropping(false)}><X size={18} /></button>
              </div>
              <div className="cropper-container">
                <Cropper
                  image={tempImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={window.innerWidth / window.innerHeight}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="cropper-controls">
                <div className="setting-item" style={{ width: '100%', marginBottom: '20px' }}>
                  <div className="setting-header">
                    <label className="text-sm">Zoom</label>
                    <span className="text-xs">{zoom}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button className="neon-btn secondary" style={{ flex: 1 }} onClick={() => setIsCropping(false)}>ยกเลิก</button>
                  <button className="neon-btn primary" style={{ flex: 1 }} onClick={saveCroppedImage}>บันทึกพื้นหลัง</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {theme === 'bento-color' ? (
          <div className="bento-color-view fade-in">
            {/* Segmented Control */}
            {/* <div className="segmented-control">
              <button className="segment-btn active"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 4px)', gap: '2px' }}>{Array(4).fill(0).map((_, i) => <div key={i} style={{ width: '4px', height: '4px', background: 'currentColor' }}></div>)}</div> Grid</button>
              <button className="segment-btn"><div style={{ display: 'flex', gap: '2px' }}>{Array(6).fill(0).map((_, i) => <div key={i} style={{ width: '3px', height: '3px', background: 'currentColor', borderRadius: '50%' }}></div>)}</div> Swarm</button>
              <button className="segment-btn"><div style={{ display: 'flex', gap: '2px' }}>{Array(3).fill(0).map((_, i) => <div key={i} style={{ width: '5px', height: '5px', border: '1px solid currentColor', borderRadius: '50%' }}></div>)}</div> Bubbles</button>
            </div>*/}

            <div className="bento-grid">
              {/* Main Chat/Input Card */}
              {/* <div className={`${cardClass} large`} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px', background: 'white' }}>
                <div className="no-scrollbar" style={{ height: '100px', overflowY: 'auto' }} ref={scrollRef}>
                  <div className="chat-container">
                    {messages.map(msg => (
                      <div key={msg.id} className={`message ${msg.sender}`} style={{
                        background: msg.sender === 'user' ? '#1a1b25' : '#f1f5f9',
                        color: msg.sender === 'user' ? 'white' : '#1a1b25',
                        borderRadius: '16px',
                        padding: '10px 14px',
                        fontSize: '0.8rem'
                      }}>{msg.text}</div>
                    ))}
                  </div>
                </div>
                <div className="chat-input-wrapper" style={{ background: '#f8faff', border: '1px solid #e2e8f0' }}>
                  <input
                    className="chat-input" placeholder="บันทึกรายการ..."
                    style={{ color: '#1a1b25' }}
                    value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="chat-send-btn" style={{ background: '#e2e8f0', color: '#1a1b25' }} onClick={() => scanFileInputRef.current?.click()}>
                      <ImageIcon size={18} />
                    </button>
                    <button className="chat-send-btn" onClick={handleSendMessage} style={{ background: '#1a1b25' }}><Send size={16} color="white" /></button>
                  </div>
                </div>
              </div>*/}

              {/* Dynamic Category Cards */}
              {Object.entries(
                transactions.reduce((acc, tx) => {
                  if (tx.type === 'expense') {
                    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
                  }
                  return acc;
                }, {} as { [key: string]: number })
              ).sort((a, b) => b[1] - a[1]).map(([cat, amount], idx) => {
                const colors = ['card-pink', 'card-mint', 'card-blue', 'card-cyan', 'card-orange', 'card-yellow', 'card-purple', 'card-red', 'card-green'];//'card-red', 'card-green', 
                const colorClass = colors[idx % colors.length];
                const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;

                // Icon mapping
                const getIcon = (category: string) => {
                  if (category.includes('อาหาร')) return <Utensils size={24} />;
                  if (category.includes('เดินทาง')) return <Car size={24} />;
                  if (category.includes('บันเทิง')) return <PlayCircle size={24} />;
                  if (category.includes('สุขภาพ')) return <HeartPulse size={24} />;
                  if (category.includes('ช็อปปิ้ง')) return <ShoppingBag size={24} />;
                  if (category.includes('สินเชื่อ')) return <CreditCard size={24} />;
                  return <Sparkles size={24} />;
                };

                return (
                  <div key={cat} className={`bento-card ${idx === 0 ? 'large' : ''} ${colorClass}`}>
                    <div className="service-card">
                      <div className="service-badge">{percentage}%</div>
                      <div className="service-icon-box" style={{ background: 'white' }}>
                        <div style={{ color: '#1a1b25' }}>{getIcon(cat)}</div>
                      </div>
                      <div>
                        <h3 className="service-title" style={{ fontSize: idx === 0 ? '0.85rem' : '0.7rem' }}>{cat}</h3>
                        <div className="service-amount" style={{ fontSize: idx === 0 ? '1.75rem' : '1.25rem' }}>฿{amount.toLocaleString()}</div>
                        {idx === 0 && <div className="service-subtext">~฿{(amount * 12).toLocaleString()}/yr</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Block */}
            <div className="bento-summary">
              <div className="summary-item">
                <div className="summary-label">Total / Month</div>
                <div className="summary-value">฿{totalExpense.toLocaleString()}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Yearly Projection</div>
                <div className="summary-value accent">฿{(totalExpense * 12).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ padding: '40px 20px', textAlign: 'center', position: 'relative' }}>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBottomThemeDropdownOpen(!isBottomThemeDropdownOpen);
                }}
                style={{ margin: '0 auto', background: '#1a1b25', color: 'white', padding: '12px 24px', borderRadius: '16px', gap: '8px' }}
              >
                <Sparkles size={18} /> Switch Theme
              </button>
              {isBottomThemeDropdownOpen && (
                <div className="theme-dropdown" style={{ bottom: 'calc(100% + 12px)', top: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 1001 }}>
                  <button className={`dropdown-item ${(theme as string) === 'glass' ? 'active' : ''}`} onClick={() => selectTheme('glass')}><Moon size={16} /> Glass Mode</button>
                  <button className={`dropdown-item ${(theme as string) === 'oled' ? 'active' : ''}`} onClick={() => selectTheme('oled')}><Sun size={16} /> OLED Mode</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon' ? 'active' : ''}`} onClick={() => selectTheme('neon')}><Sparkles size={16} /> Neon Cyan</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon-orange' ? 'active' : ''}`} onClick={() => selectTheme('neon-orange')}><Sparkles size={16} /> Neon Orange</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon-blue' ? 'active' : ''}`} onClick={() => selectTheme('neon-blue')}><Sparkles size={16} /> Neon Blue</button>
                  <button className={`dropdown-item ${(theme as string) === 'neon-red' ? 'active' : ''}`} onClick={() => selectTheme('neon-red')}><Sparkles size={16} /> Neon Red</button>
                  <button className={`dropdown-item ${(theme as string) === 'bento-color' ? 'active' : ''}`} onClick={() => selectTheme('bento-color')}><LayoutGrid size={16} /> Bento Color</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bento-grid">
            <div className={`${cardClass} large glow`}>
              <p className="text-xs">ยอดเงินคงเหลือ</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span className="text-huge">{totalBalance < 0 ? '-' : ''}฿{Math.floor(Math.abs(totalBalance)).toLocaleString()}</span>
                <span className="text-base text-teal">.{(Math.abs(totalBalance) % 1).toFixed(2).split('.')[1]}</span>
              </div>
              <Wallet size={24} className="text-teal" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.8 }} />
            </div>

            <div className={cardClass}>
              <TrendingUp size={24} className="text-teal" />
              <p className="text-xs" style={{ marginTop: '12px' }}>รายรับ</p>
              <p className="text-lg">฿{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
            </div>

            <div className={cardClass}>
              <TrendingDown size={24} className="text-coral" />
              <p className="text-xs" style={{ marginTop: '12px' }}>รายจ่าย</p>
              <p className="text-lg">฿{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
            </div>

            <div className={`${cardClass} large`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="no-scrollbar" style={{ height: '200px', overflowY: 'auto' }} ref={scrollRef}>
                <div className="chat-container">
                  {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.sender}`}>{msg.text}</div>
                  ))}
                </div>
              </div>
              <div className="chat-input-wrapper">
                <input
                  className="chat-input" placeholder="บอกรายการที่นี่..."
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="chat-send-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => scanFileInputRef.current?.click()} title="สแกนสลิป">
                    <ImageIcon size={18} />
                  </button>
                  <button className="chat-send-btn" onClick={handleSendMessage}><Send size={16} color="black" /></button>
                </div>
                <input type="file" ref={scanFileInputRef} hidden accept="image/*" multiple onChange={handleSlipUpload} />
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><History size={16} /> รายการล่าสุด</h2>
              {transactions.length > 5 && (
                <button onClick={() => setViewAll(!viewAll)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {viewAll ? <><ChevronUp size={14} /> แสดงน้อยลง</> : <><ChevronDown size={14} /> ดูทั้งหมด</>}
                </button>
              )}
            </div>

            {displayedTransactions.map(tx => (
              <React.Fragment key={tx.id}>
                <div className={`${cardClass} large`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{ flexShrink: 0, padding: '8px', borderRadius: '10px', background: tx.type === 'income' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(251, 113, 133, 0.1)' }}>
                      {tx.type === 'income' ? <ArrowUpRight size={18} className="text-teal" /> : <ArrowDownLeft size={18} className="text-coral" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p className="text-sm" style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}>
                          {tx.note}
                        </p>
                        <span style={{
                          fontSize: '0.55rem',
                          opacity: 0.6,
                          background: 'rgba(255,255,255,0.08)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          whiteSpace: 'nowrap'
                        }}>
                          {tx.category}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.6rem', opacity: 0.5 }}>{tx.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <p className={`text-lg ${tx.type === 'income' ? 'text-teal' : 'text-coral'}`} style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="action-btn edit" style={{ padding: '6px' }} onClick={() => setEditingTx(editingTx?.id === tx.id ? null : tx)}><Edit2 size={14} /></button>
                      <button className="action-btn delete" style={{ padding: '6px' }} onClick={() => deleteTransaction(tx.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
                {editingTx?.id === tx.id && (
                  <div className="inline-edit-area">
                    <div className="inline-row">
                      <div className="neon-input-group" style={{ flex: 1 }}>
                        <label className="text-xs">จำนวนเงิน (฿)</label>
                        <input type="number" step="any" className="neon-input" value={editingTx.amount} onChange={e => setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="neon-input-group" style={{ flex: 1 }}>
                        <label className="text-xs">บันทึกช่วยจำ</label>
                        <input className="neon-input" value={editingTx.note} onChange={e => setEditingTx({ ...editingTx, note: e.target.value })} />
                      </div>
                    </div>
                    <div className="inline-row">
                      <div className="neon-toggle-container">
                        <label className="text-xs">ประเภท</label>
                        <div className={`neon-toggle ${editingTx.type}`} onClick={() => setEditingTx({ ...editingTx, type: editingTx.type === 'income' ? 'expense' : 'income' })}>
                          <div className="toggle-thumb"></div><span className="toggle-label">{editingTx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
                        </div>
                      </div>
                      <div className="neon-input-group" style={{ flex: 1 }}>
                        <label className="text-xs">หมวดหมู่</label>
                        <div className="category-icon-grid" style={{ gridColumn: 'span 2' }}>
                          {editingTx.type === 'income' ? (
                            <div className="category-option active">
                              <div className="icon-wrap cat-income"><TrendingUp size={20} /></div>
                              <span className="cat-label">รายได้</span>
                            </div>
                          ) : (
                            [
                              { id: 'อาหารและเครื่องดื่ม', label: 'อาหาร', icon: <Utensils size={20} />, class: 'cat-food' },
                              { id: 'การเดินทาง', label: 'เดินทาง', icon: <Car size={20} />, class: 'cat-transport' },
                              { id: 'ของใช้จำเป็น', label: 'จำเป็น', icon: <Package size={20} />, class: 'cat-essential' },
                              { id: 'ช็อปปิ้ง', label: 'ช้อปปิ้ง', icon: <ShoppingBag size={20} />, class: 'cat-shop' },
                              { id: 'บันเทิง', label: 'บันเทิง', icon: <PlayCircle size={20} />, class: 'cat-ent' },
                              { id: 'ของใช้ในบ้าน', label: 'บ้าน', icon: <Home size={20} />, class: 'cat-home' },
                              { id: 'สุขภาพ', label: 'สุขภาพ', icon: <HeartPulse size={20} />, class: 'cat-health' },
                              { id: 'ครอบครัว', label: 'ครอบครัว', icon: <Users size={20} />, class: 'cat-family' },
                              { id: 'ท่องเที่ยว', label: 'ท่องเที่ยว', icon: <Palmtree size={20} />, class: 'cat-travel' },
                              { id: 'การศึกษา', label: 'ศึกษา', icon: <GraduationCap size={20} />, class: 'cat-edu' },
                              { id: 'สินเชื่อ บัตรเครดิต', label: 'สินเชื่อ', icon: <CreditCard size={20} />, class: 'cat-debt' },
                              { id: 'ค่าโทรศัพท์', label: 'โทรศัพท์', icon: <Phone size={20} />, class: 'cat-phone' },
                              { id: 'งาน', label: 'งาน', icon: <Briefcase size={20} />, class: 'cat-work' },
                              { id: 'เงินออม', label: 'เงินออม', icon: <Coins size={20} />, class: 'cat-save' },
                              { id: 'อื่นๆ', label: 'อื่นๆ', icon: <MoreHorizontal size={20} />, class: 'cat-other' }
                            ].map(cat => (
                              <div
                                key={cat.id}
                                className={`category-option ${editingTx.category === cat.id ? 'active' : ''}`}
                                onClick={() => setEditingTx({ ...editingTx, category: cat.id })}
                              >
                                <div className={`icon-wrap ${cat.class}`}>{cat.icon}</div>
                                <span className="cat-label">{cat.label}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="inline-row" style={{ justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="neon-btn primary" onClick={updateTransaction}>บันทึก</button>
                        <button className="neon-btn secondary" onClick={() => setEditingTx(null)}>ยกเลิก</button>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

      </div>
    </>
  );
};

export default App;
