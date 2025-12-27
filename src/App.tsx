import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Send,
  Sparkles,
  Trash2,
  Edit2,
  X,
  ChevronDown,
  ChevronUp
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

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('bento-transactions', JSON.stringify(transactions));
  }, [transactions]);

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
    // Basic NLP-like parsing for Thai
    const amountMatch = text.match(/[\d,]+/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;

    if (amount === 0) return null;

    let type: 'income' | 'expense' = 'expense';
    const incomeKeywords = ['เงินเดือน', 'ได้เงิน', 'เข้า', 'รายรับ', 'โอนเข้า', 'ถอนเงิน'];
    if (incomeKeywords.some(k => text.includes(k))) {
      type = 'income';
    }

    // Clean note: remove amount and keywords
    let note = text.replace(/[\d,]+/g, '').replace(/บาท|บ./g, '').trim();
    if (!note) note = type === 'income' ? 'รายรับเพิ่มขึ้น' : 'รายจ่ายใหม่';

    return { amount, type, note };
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: chatInput, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);

    const parsed = parseNaturalLanguage(chatInput);

    if (parsed) {
      const newTx: Transaction = {
        id: (Date.now() + 1).toString(),
        amount: parsed.amount,
        type: parsed.type,
        category: 'Chat Input',
        date: new Date().toLocaleDateString('th-TH'),
        note: parsed.note
      };

      setTransactions([newTx, ...transactions]);

      const botMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: `บันทึก${parsed.type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${parsed.amount.toLocaleString()} บาท เรียบร้อยแล้วครับ! ✅`,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
    } else {
      const botMsg: Message = { id: (Date.now() + 2).toString(), text: 'ขอโทษครับ ลองพิมพ์เป็น "ค่าอาหาร 50" นะครับ', sender: 'bot' };
      setMessages(prev => [...prev, botMsg]);
    }

    setChatInput('');
  };

  const deleteTransaction = (id: string) => {
    if (confirm('ยืนยันการลบรายการนี้?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const updateTransaction = () => {
    if (!editingTx) return;
    setTransactions(transactions.map(t => t.id === editingTx.id ? editingTx : t));
    setEditingTx(null);
  };

  const displayedTransactions = viewAll ? transactions : transactions.slice(0, 5);

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-xl">Spending</h1>
          <p className="text-xs">Bento AI Assistant</p>
        </div>
        <div className="bento-card glass" style={{ padding: '10px' }}>
          <Sparkles size={20} className="text-teal" />
        </div>
      </header>

      <div className="bento-grid">
        {/* Total Balance Card */}
        <div className="bento-card large glass glow">
          <p className="text-xs">ยอดเงินคงเหลือ</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span className="text-huge">฿{totalBalance.toLocaleString()}</span>
            <span className="text-xs text-teal">.00</span>
          </div>
          <Wallet size={24} style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>

        {/* Income Card */}
        <div className="bento-card">
          <TrendingUp size={24} className="text-teal" />
          <p className="text-xs" style={{ marginTop: '12px' }}>รายรับ</p>
          <p className="text-lg">฿{totalIncome.toLocaleString()}</p>
        </div>

        {/* Expense Card */}
        <div className="bento-card">
          <TrendingDown size={24} className="text-coral" />
          <p className="text-xs" style={{ marginTop: '12px' }}>รายจ่าย</p>
          <p className="text-lg">฿{totalExpense.toLocaleString()}</p>
        </div>

        {/* Chat Section Card */}
        <div className="bento-card large" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            className="no-scrollbar"
            style={{ height: '240px', overflowY: 'auto' }}
            ref={scrollRef}
          >
            <div className="chat-container">
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input Integrated */}
          <div className="chat-input-wrapper">
            <input
              type="text" className="chat-input" placeholder="บอกรายการที่นี่..."
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="chat-send-btn" onClick={handleSendMessage}><Send size={16} color="black" /></button>
          </div>
        </div>

        {/* Activity Title */}
        <div style={{ gridColumn: 'span 2', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <History size={16} /> รายการล่าสุด
          </h2>
          {transactions.length > 5 && (
            <button
              onClick={() => setViewAll(!viewAll)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {viewAll ? <><ChevronUp size={14} /> แสดงน้อยลง</> : <><ChevronDown size={14} /> ดูทั้งหมด</>}
            </button>
          )}
        </div>

        {/* Transaction History Items */}
        {displayedTransactions.map(tx => (
          <React.Fragment key={tx.id}>
            <div className="bento-card large" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  padding: '8px', borderRadius: '10px',
                  background: tx.type === 'income' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(251, 113, 133, 0.1)'
                }}>
                  {tx.type === 'income' ? <ArrowUpRight size={18} className="text-teal" /> : <ArrowDownLeft size={18} className="text-coral" />}
                </div>
                <div>
                  <p className="text-sm">{tx.note}</p>
                  <p className="text-xs">{tx.date}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <p className={`text-lg ${tx.type === 'income' ? 'text-teal' : 'text-coral'}`} style={{ marginRight: '4px' }}>
                  {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="action-btn edit" onClick={() => setEditingTx(editingTx?.id === tx.id ? null : tx)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="action-btn delete" onClick={() => deleteTransaction(tx.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Inline Neon Edit Form */}
            {editingTx?.id === tx.id && (
              <div className="inline-edit-area">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
                  <span className="text-xs text-teal" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} /> แก้ไขรายการ
                  </span>
                  <button className="action-btn" onClick={() => setEditingTx(null)}><X size={16} /></button>
                </div>

                <div className="inline-row">
                  <div className="neon-toggle-container">
                    <label className="text-xs">ประเภท</label>
                    <div
                      className={`neon-toggle ${editingTx.type}`}
                      onClick={() => setEditingTx({ ...editingTx, type: editingTx.type === 'income' ? 'expense' : 'income' })}
                    >
                      <div className="toggle-thumb"></div>
                      <span className="toggle-label">{editingTx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
                    </div>
                  </div>

                  <div className="neon-input-group" style={{ flex: 1 }}>
                    <label className="text-xs">จำนวนเงิน (฿)</label>
                    <input
                      type="number" className="neon-input" value={editingTx.amount}
                      onChange={e => setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="inline-row">
                  <div className="neon-input-group" style={{ flex: 1 }}>
                    <label className="text-xs">บันทึกช่วยจำ</label>
                    <input
                      className="neon-input" value={editingTx.note}
                      onChange={e => setEditingTx({ ...editingTx, note: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="neon-btn primary" onClick={updateTransaction}>
                      บันทึก
                    </button>
                    <button className="neon-btn secondary" onClick={() => setEditingTx(null)}>
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {transactions.length === 0 && (
          <div className="bento-card large" style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>
            <div style={{ marginBottom: '12px' }}><PieChart size={40} style={{ margin: '0 auto' }} /></div>
            <p className="text-sm">ยังไม่มีข้อมูลรายการ</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
