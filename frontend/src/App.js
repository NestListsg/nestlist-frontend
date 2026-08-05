import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewListing from './pages/NewListing';
import MyListings from './pages/MyListings';
import Enquiries from './pages/Enquiries';
import Buyers from './pages/Buyers';
import BuyerProfile from './pages/BuyerProfile';
import Sellers from './pages/Sellers';
import SellerProfile from './pages/SellerProfile';
import PricingReports from './pages/PricingReports';
import Resources from './pages/Resources';
import MyProfile from './pages/MyProfile';
import Billing from './pages/Billing';
import PublicListing from './pages/PublicListing';
import InstagramCallback from './pages/InstagramCallback';
import FacebookCallback from './pages/FacebookCallback';
import ResetPassword from './pages/ResetPassword';
import ChatWidget from './pages/ChatWidget';
import PropertyTaxCalculator from './pages/PropertyTaxCalculator';

const LOGO = '/logo_2.png';

function Sidebar({ page, setPage, agent, onLogout, isOpen, onClose, listingsTab, setListingsTab }) {
  const navItems = ['Dashboard', 'New Listing', 'My Listings', 'Enquiries', 'Buyer Management', 'Sellers', 'Pricing Reports', 'Property Tax Calculator', 'Resources', 'My Profile', 'Billing'];
  const initials = agent?.name?.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || 'NL';

  const handleNavClick = (item) => {
    setPage(item);
    onClose();
  };

  const handleListingsSubClick = (tab) => {
    setListingsTab(tab);
    setPage('My Listings');
    onClose();
  };

  return (
    <>
      <div className={`sb-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sb-logo">
          <img src={LOGO} alt="NestList" />
          <div className="sb-tagline">Smarter Listings. Better Results.</div>
        </div>
        <div className="sb-agent">
          <div className="sb-agent-name">{agent?.name}</div>
          <div className="sb-agent-spec">{agent?.specialty}</div>
        </div>
        <div className="sb-nav-label">Navigation</div>
        {navItems.map(item => (
          <React.Fragment key={item}>
            <button className={`sb-item ${page === item ? 'active' : ''}`} onClick={() => handleNavClick(item)}>
              {item}
              {item === 'My Listings' && (
                <span style={{ float: 'right', opacity: 0.6 }}>{page === 'My Listings' ? '▾' : '▸'}</span>
              )}
            </button>
            {item === 'My Listings' && page === 'My Listings' && (
              <>
                <button
                  className={`sb-item ${listingsTab === 'active' ? 'active' : ''}`}
                  style={{ paddingLeft: '38px', fontSize: '13px' }}
                  onClick={() => handleListingsSubClick('active')}
                >
                  Active Listings
                </button>
                <button
                  className={`sb-item ${listingsTab === 'deleted' ? 'active' : ''}`}
                  style={{ paddingLeft: '38px', fontSize: '13px' }}
                  onClick={() => handleListingsSubClick('deleted')}
                >
                  Deleted Listings
                </button>
              </>
            )}
          </React.Fragment>
        ))}
        <div className="sb-divider" />
        <button className="sb-logout" onClick={onLogout}>Logout</button>
      </div>
    </>
  );
}

function Header({ agent }) {
  const initials = agent?.name?.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || 'NL';
  return (
    <>
      <div className="nl-header">
        <div>
          <div className="nl-brand">NEST<span>LIST</span><span className="nl-prestige">PRESTIGE</span></div>
          <div className="nl-tagline">Singapore's AI-Powered Property Platform</div>
        </div>
        <div className="nl-right">
          <div className="nl-avatar">{initials}</div>
          <div className="nl-agent-name">{agent?.name}</div>
        </div>
      </div>
      <div className="nl-accent" />
      <div className="nl-welcome">
        <div className="nl-welcome-text">Welcome back, <strong>{agent?.name}</strong> &nbsp;·&nbsp; {agent?.specialty}</div>
        <div className="nl-badge">Prestige</div>
      </div>
    </>
  );
}

function AuthenticatedApp() {
  const [token, setToken] = useState(localStorage.getItem('nl_token'));
  const [agent, setAgent] = useState(JSON.parse(localStorage.getItem('nl_agent') || 'null'));
  const [page, setPage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [listingsTab, setListingsTab] = useState('active');
  const [selectedBuyerId, setSelectedBuyerId] = useState(null);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [activeListingId, setActiveListingId] = useState(null);

  const handleEditListing = (listing) => {
    setEditingListing(listing);
    setPage('New Listing');
  };

  const handleConvertSeller = (seller) => {
    setEditingListing(seller);
    setPage('New Listing');
  };

  const navigateTo = (p) => {
    setEditingListing(null);
    setSelectedBuyerId(null);
    setSelectedSellerId(null);
    setActiveListingId(null);  // leaving the page a listing was open on -- drop the assistant's context
    setPage(p);
  };

  const handleLogin = (token, agent) => {
    localStorage.setItem('nl_token', token);
    localStorage.setItem('nl_agent', JSON.stringify(agent));
    setToken(token);
    setAgent(agent);
  };

  const handleLogout = () => {
    localStorage.removeItem('nl_token');
    localStorage.removeItem('nl_agent');
    setToken(null);
    setAgent(null);
  };

  const updateAgent = (updated) => {
    localStorage.setItem('nl_agent', JSON.stringify(updated));
    setAgent(updated);
  };

  if (!token || !agent) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch(page) {
      case 'Dashboard': return <Dashboard agent={agent} token={token} setPage={navigateTo} />;
      case 'New Listing': return <NewListing agent={agent} token={token} editingListing={editingListing} onDoneEditing={() => { setEditingListing(null); setPage('My Listings'); }} />;
      case 'My Listings': return <MyListings agent={agent} token={token} onEdit={handleEditListing} listingsTab={listingsTab} onListingOpen={setActiveListingId} />;
      case 'Enquiries': return <Enquiries agent={agent} token={token} />;
      case 'Buyer Management': return selectedBuyerId
        ? <BuyerProfile token={token} buyerId={selectedBuyerId} onBack={() => setSelectedBuyerId(null)} />
        : <Buyers token={token} onSelectBuyer={setSelectedBuyerId} />;
      case 'Sellers': return selectedSellerId
        ? <SellerProfile token={token} sellerId={selectedSellerId} onBack={() => setSelectedSellerId(null)} onConvertToListing={handleConvertSeller} />
        : <Sellers token={token} onSelectSeller={setSelectedSellerId} />;
      case 'Pricing Reports': return <PricingReports token={token} />;
      case 'Property Tax Calculator': return <PropertyTaxCalculator />;
      case 'Resources': return <Resources />;
      case 'My Profile': return <MyProfile agent={agent} token={token} onUpdate={updateAgent} />;
      case 'Billing': return <Billing />;
      default: return <Dashboard agent={agent} token={token} setPage={setPage} />;
    }
  };

  return (
    <div className="app-wrap">
      <button className="sb-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
      <Sidebar
        page={page}
        setPage={navigateTo}
        agent={agent}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        listingsTab={listingsTab}
        setListingsTab={setListingsTab}
      />
      <div className="main">
        <Header agent={agent} />
        {renderPage()}
      </div>
      <ChatWidget token={token} activeListingId={activeListingId} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/l/:listingId" element={<PublicListing />} />
        <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
        <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<AuthenticatedApp />} />
      </Routes>
    </Router>
  );
}

export default App;
export { LOGO };
