import React, { useState, useEffect, useRef } from 'react';
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
  MoreHorizontal
} from 'lucide-react';
import './index.css';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note: string;
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

  const [theme, setTheme] = useState<'glass' | 'oled' | 'neon' | 'neon-orange' | 'neon-blue' | 'neon-red'>(() => {
    return (localStorage.getItem('bento-theme') as 'glass' | 'oled' | 'neon' | 'neon-orange' | 'neon-blue' | 'neon-red') || 'glass';
  });

  const [blur, setBlur] = useState<number>(() => parseInt(localStorage.getItem('glass-blur') || '20'));
  const [opacity, setOpacity] = useState<number>(() => parseInt(localStorage.getItem('glass-opacity') || '15'));
  const [bgImage, setBgImage] = useState<string>(() => localStorage.getItem('glass-bg') || '');
  const [bgBlur, setBgBlur] = useState<number>(() => parseInt(localStorage.getItem('glass-bg-blur') || '0'));
  const [bgDim, setBgDim] = useState<number>(() => parseInt(localStorage.getItem('glass-bg-dim') || '100'));

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('bento-transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('bento-theme', theme);
    document.body.classList.remove('theme-oled', 'theme-neon', 'theme-neon-orange', 'theme-neon-blue', 'theme-neon-red');
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

  const totalBalance = transactions.reduce((acc, curr) =>
    curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

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

    // AI Category Mapping
    let category = type === 'income' ? 'รายได้' : 'อื่นๆ';
    const categoryMap: { [key: string]: string[] } = {
      'อาหารและเครื่องดื่ม': ['กิน', 'ข้าว', 'น้ำ', 'กาแฟ', 'อร่อย', 'ชา', 'ขนม', 'ส้มตำ', 'ก๋วยเตี๋ยว', 'บุฟเฟต์', 'บุฟเฟ่ต์', 'มื้อ', 'อาหาร', 'ค่าอาหาร', 'Grab', 'Lineman', 'Foodpanda', 'ShopeeFood', 'เซเว่น', 'คาเฟ่'],
      'การเดินทาง': ['รถ', 'น้ำมัน', 'วิน', 'แท็กซี่', 'BTS', 'MRT', 'เรือ', 'ตั๋วเครื่องบิน', 'ทางด่วน', 'ที่จอดรถ', 'GrabCar', 'Bolt', 'ล้างรถ', 'ซ่อมรถ'],
      'ของใช้จำเป็น': ['ทิชชู่', 'สบู่', 'ยาสีฟัน', 'ผงซักฟอก', 'ของแห้ง', 'ตลาด', 'ซุปเปอร์', 'ของใช้ส่วนตัว', 'ผ้าอนามัย', 'แชมพู'],
      'ครอบครัว': ['ลูก', 'พ่อ', 'แม่', 'ภรรยา', 'สามี', 'ให้เงิน', 'กตัญญู', 'โรงเรียนลูก', 'ของเล่น', 'แพมเพิส', 'นมผง'],
      'สุขภาพ': ['ยา', 'หมอ', 'โรงพยาบาล', 'คลินิก', 'วิตามิน', 'หมอฟัน', 'หาหมอ', 'ฟิตเนส', 'แว่นตา', 'ตรวจสุขภาพ'],
      'ของใช้ในบ้าน': ['เฟอร์นิเจอร์', 'ตกแต่ง', 'เครื่องครัว', 'ซ่อมบ้าน', 'หลอดไฟ', 'เครื่องซักผ้า', 'ตู้เย็น', 'พัดลม', 'แอร์'],
      'ท่องเที่ยว': ['โรงแรม', 'ทริป', 'ทัวร์', 'ต่างประเทศ', 'ทะเล', 'พักร้อน', 'รีสอร์ท', 'ตั๋วเครื่องบิน', 'ตั๋วรถไฟ'],
      'การศึกษา': ['เรียน', 'คอร์ส', 'หนังสือ', 'ติว', 'มหาวิทยาลัย', 'เทอม', 'กวดวิชา', 'เครื่องเขียน', 'อบรม'],
      'สินเชื่อ บัตรเครดิต': ['บัตรเครดิต', 'สินเชื่อ', 'งวด', 'ดอกเบี้ย', 'จ่ายบัตร', 'กู้', 'ผ่อนรถ', 'ผ่อนบ้าน'],
      'ค่าโทรศัพท์': ['โทรศัพท์', 'มือถือ', 'รายเดือน', 'เติมเงิน', 'เน็ตมือถือ', 'AIS', 'True', 'DTAC'],
      'บันเทิง': ['หนัง', 'ดูหนัง', 'คอนเสิร์ต', 'เกม', 'เติมเกม', 'ปาร์ตี้', 'เหล้า', 'เบียร์', 'คาราโอเกะ', 'Netflix', 'Spotify', 'Youtube Premium'],
      'งาน': ['อุปกรณ์ทำงาน', 'ภาษี', 'สัมมนา', 'ธุรกิจ', 'ลงทุนงาน', 'สตาฟ', 'เลขา'],
      'เงินออม': ['ออมเงิน', 'กองทุน', 'หุ้น', 'ทอง', 'เงินฝาก', 'เก็บเงิน', 'ประกันชีวิต', 'SSF', 'RMF'],
      'ช็อปปิ้ง': ['ซื้อ', 'เสื้อ', 'กางเกง', 'รองเท้า', 'ของใช้', 'ห้าง', 'Lazada', 'Shopee', 'ไดโซะ', 'เครื่องสำอาง', 'น้ำหอม']
    };

    if (type === 'expense') {
      for (const [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(k => text.includes(k))) {
          category = cat;
          break;
        }
      }
    }

    // Fix: Escape the dot in 'บ.' to match literal 'บ.' and not wildcard any character
    let note = text.replace(/[\d,]+/g, '').replace(/บาท|บ\./g, '').trim();
    if (!note) note = type === 'income' ? 'รายรับเพิ่มขึ้น' : 'รายจ่ายใหม่';
    return { amount, type, note, category };
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: chatInput, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    const parsed = parseNaturalLanguage(chatInput);
    if (parsed) {
      const newTx: Transaction = {
        id: (Date.now() + 1).toString(), amount: parsed.amount, type: parsed.type,
        category: parsed.category, date: new Date().toLocaleDateString('th-TH'), note: parsed.note
      };
      setTransactions([newTx, ...transactions]);
      const botMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: `บันทึก${parsed.type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${parsed.amount.toLocaleString()} บาท เรียบร้อยแล้วครับ! ✅`,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
    } else {
      setMessages(prev => [...prev, { id: 'bot-err', text: 'ขอโทษครับ ลองพิมพ์เป็น "ค่าอาหาร 50" นะครับ', sender: 'bot' }]);
    }
    setChatInput('');
  };

  const deleteTransaction = (id: string) => {
    if (confirm('ยืนยันการลบรายการนี้?')) setTransactions(transactions.filter(t => t.id !== id));
  };

  const updateTransaction = () => {
    if (!editingTx) return;
    setTransactions(transactions.map(t => t.id === editingTx.id ? editingTx : t));
    setEditingTx(null);
  };

  const toggleTheme = () => {
    const themes: ('glass' | 'oled' | 'neon' | 'neon-orange' | 'neon-blue' | 'neon-red')[] = ['glass', 'oled', 'neon', 'neon-orange', 'neon-blue', 'neon-red'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert('รูปภาพใหญ่เกินไปครับ (จำกัด 1.5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBgImage(base64String);
      };
      reader.readAsDataURL(file);
    }
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
    <div className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        <div>
          <h1 className="text-xl">Expense</h1>
          <p className="text-xs">Bento AI Assistant</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="action-btn" onClick={toggleTheme} title="เปลี่ยนโหมด">
            {theme === 'glass' ? <Moon size={18} /> : theme === 'oled' ? <Sun size={18} /> : <Sparkles size={18} />}
          </button>
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
            <p className="text-xs" style={{ opacity: 0.5, fontStyle: 'italic' }}>* Settings only apply in Glass Mode</p>
          </div>
        </div>
      )}

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
            <button className="chat-send-btn" onClick={handleSendMessage}><Send size={16} color="black" /></button>
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
            <div className={`${cardClass} large`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: tx.type === 'income' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(251, 113, 133, 0.1)' }}>
                  {tx.type === 'income' ? <ArrowUpRight size={18} className="text-teal" /> : <ArrowDownLeft size={18} className="text-coral" />}
                </div>
                <div>
                  <p className="text-sm">
                    {tx.note}
                    <span style={{
                      fontSize: '0.65rem',
                      opacity: 0.6,
                      background: 'rgba(255,255,255,0.08)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      marginLeft: '8px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {tx.category}
                    </span>
                  </p>
                  <p className="text-xs">{tx.date}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <p className={`text-lg ${tx.type === 'income' ? 'text-teal' : 'text-coral'}`}>{tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="action-btn edit" onClick={() => setEditingTx(editingTx?.id === tx.id ? null : tx)}><Edit2 size={16} /></button>
                  <button className="action-btn delete" onClick={() => deleteTransaction(tx.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
            {editingTx?.id === tx.id && (
              <div className="inline-edit-area">
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
                          { id: 'สินเชื่อ บัตรเครดิต', label: 'บัตร/หนี้', icon: <CreditCard size={20} />, class: 'cat-debt' },
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
    </div>
  );
};

export default App;
