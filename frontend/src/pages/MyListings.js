import React, { useEffect, useState } from 'react';
import { formatPriceM } from '../utils/format';
import MatchingBuyers from '../components/MatchingBuyers';

const API = process.env.REACT_APP_API_URL || '';

// PropertyGuru's listing description field enforces a hard character cap --
// unlike Facebook/Instagram/LinkedIn/WhatsApp, which comfortably fit our full
// write-up as-is. This constant (and truncateToLimit below) is only ever read
// from the 'propertyguru' branch inside generateCaption, so tightening or
// loosening it can never affect how much text any other platform gets --
// each platform keeps its own separately-defined template, untouched.
// Set to 2000 per Janel's own experience actually submitting listings there;
// adjust this one number if PropertyGuru's real limit turns out to differ.
const PROPERTYGURU_CHAR_LIMIT = 2000;

// Agents can additionally choose a shorter write-up than the 2000-char max --
// useful when they want a punchier description, or just prefer PropertyGuru
// listings to read like a summary rather than the full story. 'full' always
// stays pinned to PROPERTYGURU_CHAR_LIMIT itself (so raising/lowering that one
// constant moves the Full tier automatically); the shorter tiers are fixed
// targets independent of it.
const PROPERTYGURU_LENGTHS = [
  { key: 'full', label: 'Full', limit: PROPERTYGURU_CHAR_LIMIT },
  { key: 'short', label: 'Short', limit: 600 },
  { key: 'brief', label: 'Brief', limit: 300 },
];

// Cuts at the last full sentence before the limit where possible, falling
// back to the last full word, so a listing description never gets chopped
// mid-word/mid-sentence -- that would look like a NestList bug, not a
// deliberate truncation, to whoever reads it on PropertyGuru.
function truncateToLimit(text, limit) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  // Sentence endings in our write-ups are usually followed by a paragraph
  // break (".\n\n"), not a literal ". " -- matching only a literal space
  // here missed those, so a valid stopping point right at a paragraph's end
  // was skipped in favour of chopping into the middle of the next sentence.
  // \s (any whitespace) or end-of-string catches both cases.
  const sentenceEnds = [...cut.matchAll(/[.!?](?=\s|$)/g)];
  const lastSentenceEnd = sentenceEnds.length ? sentenceEnds[sentenceEnds.length - 1].index : -1;
  if (lastSentenceEnd > limit * 0.6) return cut.slice(0, lastSentenceEnd + 1).trimEnd();
  const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf(' '));
  return (lastBreak > 0 ? cut.slice(0, lastBreak) : cut).trim() + '…';
}

// LinkedIn's audience skews toward senior corporate/HNW readers who respond
// to substance, not a listing pitch with hashtags -- a straight re-skin of
// the Facebook/Instagram template reads as tone-deaf there. Instead this
// leads with a genuine market-insight angle (grounded in the same live URA
// GCB data the Market Pulse panel shows -- not invented commentary), and
// only mentions the specific listing as context within that, closing with
// a plain, low-pressure sign-off rather than a call-to-action or hashtags.
// Deliberately ignores the tldr/long/combined style toggle -- those three
// variants exist to control how much LISTING detail shows, which doesn't
// map onto an editorial market-update post the same way.
function buildLinkedInInsightCaption(listing, agent, marketPulse) {
  const mp = marketPulse || {};
  const period = mp.last_updated || 'this month';
  const hasGcbData = mp.gcb_transactions && mp.gcb_avg_psf;

  const marketLine = hasGcbData
    ? `The Good Class Bungalow segment, usually the clearest signal for where landed sentiment sits, recorded ${mp.gcb_transactions} in ${period} at an average of ${mp.gcb_avg_psf} psf${mp.gcb_largest ? `, with the largest transaction closing at ${mp.gcb_largest}` : ''}.${mp.nassim_range ? ` Nassim Road continues to trade around ${mp.nassim_range}.` : ''}`
    : `It's been a quieter month for reportable Good Class Bungalow transactions, though sentiment in the broader landed segment remains steady.`;

  const propertyContext = [
    listing.property_type ? listing.property_type.toLowerCase() : 'property',
    listing.location ? `in ${listing.location}` : '',
  ].filter(Boolean).join(' ');

  const signOff = [agent?.name, agent?.contact, agent?.agency].filter(Boolean).join('\n');

  return `Singapore's landed property market — a quick read for ${period}

${marketLine}

Against that backdrop, I'm currently representing a ${propertyContext}${listing.features ? ` — ${listing.features}` : ''}. Always glad to share more on where the landed market is heading, or hear what you're considering — no pressure either way.

${signOff}`;
}

function generateCaption(listing, platform, style, pgLimit, agent, marketPulse) {
  if (platform === 'linkedin') return buildLinkedInInsightCaption(listing, agent, marketPulse);

  const listingUrl = `nestlist.sg/l/${listing.id}`;
  const cleanContent = (listing.content || '')
    .replace(/^---/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s/gm, '')
    .replace(/\|/g, '')
    .trim();
  const body = cleanContent.slice(0, 800);
  const shortBody = cleanContent.slice(0, 300);

  const bullets = `• ${listing.land_size ? listing.land_size.toLocaleString() + ' sqft land' : 'Land on request'}
• ${listing.built_up ? listing.built_up.toLocaleString() + ' sqft built-up' : 'Built-up on request'}
• ${listing.bedrooms ? listing.bedrooms + ' Bedrooms' : 'Bedrooms on request'}
• ${listing.features || 'Premium features throughout'}`;

  // PropertyGuru gets a plain description (no hashtags/emoji scaffolding --
  // portal listing fields aren't social captions), truncated to fit its
  // character cap. It DOES still honour the Quick Summary / Full Story /
  // Both style toggle above, mirroring what every other platform's three
  // styles actually contain: Quick Summary is bullets only, Full Story is
  // prose only, Both is bullets THEN prose (matching the "AT A GLANCE" +
  // "FULL STORY" pattern the other platforms use for Both -- previously
  // this branch treated anything that wasn't Quick Summary as prose-only,
  // which meant Both silently lost its bullets here). The length picker
  // (Full/Short/Brief) layers on top of whichever style is chosen, capping
  // whatever text that style produced to the selected character limit.
  if (platform === 'propertyguru') {
    const limit = pgLimit || PROPERTYGURU_CHAR_LIMIT;
    const header = `${listing.property_type} | ${listing.location} | SGD ${formatPriceM(listing.price)}\n\n`;
    let source;
    if (style === 'tldr') source = bullets;
    else if (style === 'combined') source = `KEY FACTS\n${bullets}\n\nTHE FULL STORY\n${cleanContent}`;
    else source = cleanContent;
    return header + truncateToLimit(source, Math.max(0, limit - header.length));
  }

  const tldr = {
    facebook: `🏡 ${listing.property_type} | ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

${bullets}

Interested? Visit ${listingUrl} or drop us a message.

#NestList #NestListPrestige #SingaporeProperty #GCB #LandedProperty #PropertySG #RealEstate #Singapore #LuxuryProperty`,

    instagram: `🏡 ${listing.property_type}
📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

${bullets}

DM me or visit ${listingUrl} 🏡

#NestList #NestListPrestige #SingaporeProperty #SingaporeRealEstate #GCB #LandedProperty #LuxuryHomes #PropertySingapore #HomeSweetHome #SingaporeHome #PropertyAgent #RealEstateSingapore #LuxuryLiving #DreamHome #PropertyForSale`,

    whatsapp: `Hi! Quick summary of a new listing:

*${listing.property_type}*
📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

${bullets}

Reply to arrange a private viewing or visit ${listingUrl}. Thank you! 🙏`
  };

  const long = {
    facebook: `🏡 NEW LISTING | ${listing.property_type}
📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

${body}...

Interested? Visit ${listingUrl} or drop us a message.

#NestList #NestListPrestige #SingaporeProperty #GCB #LandedProperty #PropertySG #RealEstate #Singapore #LuxuryProperty #HomeSweetHome`,

    instagram: `✨ ${listing.property_type} for sale ✨

📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

${shortBody}...

DM me or visit ${listingUrl} to find out more 🏡

#NestList #NestListPrestige #SingaporeProperty #SingaporeRealEstate #GCB #LandedProperty #LuxuryHomes #PropertySingapore #HomeSweetHome #SingaporeHome #PropertyAgent #RealEstateSingapore #LuxuryLiving #DreamHome #SingaporeLife #PropertyInvestment #LandedHouse #Bungalow #PenthouseLiving #PropertyForSale`,

    whatsapp: `Hi! I have a new property listing that may interest you.

*${listing.property_type}*
📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

${listing.content?.slice(0, 400) || ''}...

For more details and to arrange a private viewing, please reply to this message or visit ${listingUrl}.

Thank you! 🙏`
  };

  const combined = {
    facebook: `🏡 NEW LISTING | ${listing.property_type}
📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

⚡ AT A GLANCE
${bullets}

📖 THE FULL STORY
${body}...

Interested? Visit ${listingUrl} or drop us a message.

#NestList #NestListPrestige #SingaporeProperty #GCB #LandedProperty #PropertySG #RealEstate #Singapore #LuxuryProperty #HomeSweetHome`,

    instagram: `🏡 ${listing.property_type}
📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

⚡ AT A GLANCE
${bullets}

📖 THE STORY
${shortBody}...

DM me or visit ${listingUrl} 🏡

#NestList #NestListPrestige #SingaporeProperty #SingaporeRealEstate #GCB #LandedProperty #LuxuryHomes #PropertySingapore #HomeSweetHome #SingaporeHome #PropertyAgent #RealEstateSingapore #LuxuryLiving #DreamHome #PropertyForSale`,

    whatsapp: `Hi! I have a new property listing that may interest you.

*${listing.property_type}*
📍 ${listing.location}
💰 SGD ${formatPriceM(listing.price)}

⚡ AT A GLANCE
${bullets}

📖 THE FULL STORY
${listing.content?.slice(0, 400) || ''}...

Reply to arrange a private viewing or visit ${listingUrl}. Thank you! 🙏`
  };

  const tiktok = {
    tiktok: `${listing.property_type} in ${listing.location} 🏡
SGD ${formatPriceM(listing.price)}
${listing.land_size ? listing.land_size.toLocaleString() + ' sqft' : ''} | ${listing.bedrooms ? listing.bedrooms + ' Bedrooms' : ''}
Upload your property video and use this caption 👆
DM to arrange viewing 🔑

#SingaporeProperty #PropertySG #LandedSG #RealEstateSG #SGProperty`
  };

  if (platform === 'tiktok') return tiktok.tiktok || '';
  if (style === 'tldr') return tldr[platform] || '';
  if (style === 'combined') return combined[platform] || '';
  return long[platform] || '';
}

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', emoji: '📘', url: 'https://www.facebook.com' },
  { key: 'instagram', label: 'Instagram', emoji: '📸', url: 'https://www.instagram.com' },
  { key: 'linkedin', label: 'LinkedIn', emoji: '💼', url: 'https://www.linkedin.com/feed' },
  { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', url: 'https://web.whatsapp.com' },
  { key: 'tiktok', label: 'TikTok', emoji: '🎵', url: 'https://www.tiktok.com/upload' },
  { key: 'propertyguru', label: 'PropertyGuru', emoji: '🏘️', url: 'https://accounts.propertyguru.com.sg/account/login?locale=en' },
];

// wa.me pre-fills the message text (caption + listing link) so agents land in a
// ready-to-send chat instead of a blank WhatsApp Web tab they have to paste into.
function buildWhatsAppShareUrl(listing, caption) {
  const listingUrl = `https://nestlist.sg/l/${listing.id}`;
  const message = caption ? `${caption}\n\n${listingUrl}` : listingUrl;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

const STYLES = [
  { key: 'long', label: '📖 Full Story' },
  { key: 'tldr', label: '⚡ Quick Summary' },
  { key: 'combined', label: '📖⚡ Both' },
];

// Persisted across tab switches -- this page's component unmounts on tab
// switch like every other page in the app, so plain useState alone would
// collapse the open listing every time the agent navigates away and back.
const EXPANDED_STORAGE_KEY = 'nestlist_expanded_listing';

function loadPersistedExpanded() {
  try {
    return localStorage.getItem(EXPANDED_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export default function MyListings({ agent, token, onEdit, listingsTab, onListingOpen }) {
  const [listings, setListings] = useState([]);
  const activeTab = listingsTab || 'active';
  const [removingPermanently, setRemovingPermanently] = useState({});
  const [restoring, setRestoring] = useState({});
  const [removePermanentlyError, setRemovePermanentlyError] = useState({});
  const [expanded, setExpanded] = useState(loadPersistedExpanded);
  const [activePlatform, setActivePlatform] = useState({});
  const [captionStyle, setCaptionStyle] = useState({});
  const [pgLength, setPgLength] = useState({});
  const [copied, setCopied] = useState({});
  const [deleting, setDeleting] = useState({});
  const [downloading, setDownloading] = useState({});
  const [shareStatus, setShareStatus] = useState({});
  const [posterLoading, setPosterLoading] = useState({});
  const [videoLoading, setVideoLoading] = useState({});
  const [videoError, setVideoError] = useState({});
  const [posterError, setPosterError] = useState({});
  const [posterPhotoIndex, setPosterPhotoIndex] = useState({});
  const [deletingPhoto, setDeletingPhoto] = useState({});
  const [enhancingPhoto, setEnhancingPhoto] = useState({});
  const [enhancePhotoError, setEnhancePhotoError] = useState({});
  const [igCaption, setIgCaption] = useState({});
  const [igPosting, setIgPosting] = useState({});
  const [igPostError, setIgPostError] = useState({});
  const [igPostSuccess, setIgPostSuccess] = useState({});
  const [fbCaption, setFbCaption] = useState({});
  const [fbPosting, setFbPosting] = useState({});
  const [fbPostError, setFbPostError] = useState({});
  const [fbPostSuccess, setFbPostSuccess] = useState({});
  const [liCaption, setLiCaption] = useState({});
  const [liPosting, setLiPosting] = useState({});
  const [liPostError, setLiPostError] = useState({});
  const [liPostSuccess, setLiPostSuccess] = useState({});
  const [posterTemplates, setPosterTemplates] = useState([]);
  const [posterTemplateChoice, setPosterTemplateChoice] = useState({});
  const [videoTemplates, setVideoTemplates] = useState([]);
  const [videoTemplateChoice, setVideoTemplateChoice] = useState({});
  const [marketPulse, setMarketPulse] = useState(null);

  // Feeds the LinkedIn write-up's market-insight opening -- fetched once, not
  // per-listing, since it's the same live GCB market snapshot regardless of
  // which listing an agent is captioning. Public endpoint, no auth needed.
  useEffect(() => {
    fetch(`${API}/api/market-pulse`)
      .then(r => r.json())
      .then(data => setMarketPulse(data))
      .catch(() => setMarketPulse(null));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/listings?status=all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]));
  }, [token]);

  // Restore the chatbot's listing context on mount to match whichever card
  // was left expanded before the agent last navigated away -- otherwise
  // Mary wouldn't know a listing is open until the agent re-toggles it.
  useEffect(() => {
    if (expanded) onListingOpen?.(expanded);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetch(`${API}/api/poster-templates`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setPosterTemplates(Array.isArray(data) ? data : []))
      .catch(() => setPosterTemplates([]));
  }, [token]);

  useEffect(() => {
    fetch(`${API}/api/video-templates`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setVideoTemplates(Array.isArray(data) ? data : []))
      .catch(() => setVideoTemplates([]));
  }, [token]);

  const selectedTemplateFor = (listing) =>
    posterTemplateChoice[listing.id] || listing.poster_template_id || agent.poster_template_id || 'editorial';

  const selectedVideoTemplateFor = (listing) =>
    videoTemplateChoice[listing.id] || listing.video_template_id || 'classic';

  const handleCopy = (listingId, platform, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(c => ({ ...c, [`${listingId}-${platform}`]: true }));
      setTimeout(() => setCopied(c => ({ ...c, [`${listingId}-${platform}`]: false })), 2500);
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Move this listing to Deleted Listings? It will disappear from Active Listings, but you can still view it -- or permanently delete it -- from the Deleted Listings tab.')) return;
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      await fetch(`${API}/api/listings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'archived' } : l));
    } catch (err) {
      alert('Failed to delete listing.');
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  };

  const handleRestore = async (id) => {
    setRestoring(r => ({ ...r, [id]: true }));
    try {
      await fetch(`${API}/api/listings/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'active' } : l));
    } catch (err) {
      alert('Failed to restore listing.');
    } finally {
      setRestoring(r => ({ ...r, [id]: false }));
    }
  };

  const handleRemovePermanently = async (id) => {
    if (!window.confirm('Permanently delete this listing and all its photos? This cannot be undone.')) return;
    setRemovingPermanently(r => ({ ...r, [id]: true }));
    setRemovePermanentlyError(e => ({ ...e, [id]: '' }));
    try {
      const res = await fetch(`${API}/api/listings/${id}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to permanently delete listing');
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setRemovePermanentlyError(e => ({ ...e, [id]: err.message }));
    } finally {
      setRemovingPermanently(r => ({ ...r, [id]: false }));
    }
  };

  const handleDownloadAll = async (listing) => {
    if (!listing.images || listing.images.length === 0) return;
    setDownloading(d => ({ ...d, [listing.id]: true }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/download-images`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const filename = `listing-photos-${listing.id.slice(0, 8)}.zip`;
      const file = new File([blob], filename, { type: blob.type || 'application/zip' });

      let shared = false;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          shared = true;
        } catch (shareErr) {
          if (shareErr && shareErr.name === 'AbortError') { shared = true; /* user cancelled, not a failure */ }
          // any other share failure falls through to the plain download below
        }
      }
      if (!shared) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to download photos. Please save images individually.');
    } finally {
      setDownloading(d => ({ ...d, [listing.id]: false }));
    }
  };

  // Poster/photo URLs point at Supabase Storage (a different origin from the app),
  // so a plain <a download> is silently ignored by the browser and just opens the
  // image instead of saving it. Fetching as a blob first sidesteps that.
  const handleDownloadFile = async (url, filename) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

      // On phones, a synthetic <a download> click fired after an async fetch is
      // no longer treated as a direct tap by the browser, so it silently does
      // nothing. The native share sheet (with a "Save Image"/"Save to Photos"
      // option) is the reliable way to save a file on mobile.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      window.open(url, '_blank');
    }
  };

  const handleWebShare = async (listing, platform, caption) => {
    if (!navigator.share) {
      alert('Web sharing is not supported on this browser. Please use Copy Caption instead.');
      return;
    }
    try {
      await navigator.share({
        title: `${listing.property_type} | ${listing.location}`,
        text: caption,
        url: `https://nestlist.sg/l/${listing.id}`
      });
      setShareStatus(s => ({ ...s, [`${listing.id}-${platform}`]: 'Shared!' }));
      setTimeout(() => setShareStatus(s => ({ ...s, [`${listing.id}-${platform}`]: '' })), 2500);
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('Share failed. Please use Copy Caption instead.');
      }
    }
  };

  const handleGeneratePoster = async (listing) => {
    setPosterLoading(p => ({ ...p, [listing.id]: true }));
    setPosterError(e => ({ ...e, [listing.id]: '' }));
    try {
      const photoIndex = posterPhotoIndex[listing.id] || 0;
      const templateId = selectedTemplateFor(listing);
      const res = await fetch(`${API}/api/listings/${listing.id}/generate-poster?photo_index=${photoIndex}&template_id=${templateId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate poster');
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, poster_url: data.poster_url, poster_template_id: data.poster_template_id } : l));
    } catch (err) {
      setPosterError(e => ({ ...e, [listing.id]: err.message }));
    } finally {
      setPosterLoading(p => ({ ...p, [listing.id]: false }));
    }
  };

  const handleGenerateVideo = async (listing) => {
    setVideoLoading(v => ({ ...v, [listing.id]: true }));
    setVideoError(e => ({ ...e, [listing.id]: '' }));
    try {
      const videoTemplateId = selectedVideoTemplateFor(listing);
      const photoIndex = posterPhotoIndex[listing.id] || 0;
      const res = await fetch(`${API}/api/listings/${listing.id}/generate-video?video_template_id=${videoTemplateId}&photo_index=${photoIndex}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate video');
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, video_url: data.video_url, video_template_id: data.video_template_id } : l));
    } catch (err) {
      setVideoError(e => ({ ...e, [listing.id]: err.message }));
    } finally {
      setVideoLoading(v => ({ ...v, [listing.id]: false }));
    }
  };

  const handleDeletePhoto = async (listing, index) => {
    if (!window.confirm('Remove this photo from the listing?')) return;
    setDeletingPhoto(d => ({ ...d, [`${listing.id}-${index}`]: true }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/images/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to delete photo');
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, images: data.images } : l));
      setPosterPhotoIndex(p => ({ ...p, [listing.id]: 0 }));
    } catch (err) {
      alert('Failed to delete photo.');
    } finally {
      setDeletingPhoto(d => ({ ...d, [`${listing.id}-${index}`]: false }));
    }
  };

  const handleEnhancePhoto = async (listing, index) => {
    const key = `${listing.id}-${index}`;
    setEnhancingPhoto(e => ({ ...e, [key]: true }));
    setEnhancePhotoError(e => ({ ...e, [key]: '' }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/images/${index}/enhance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to enhance photo');
      setListings(prev => prev.map(l => {
        if (l.id !== listing.id) return l;
        const images = [...l.images];
        images[index] = data.image_url;
        return { ...l, images };
      }));
    } catch (err) {
      setEnhancePhotoError(e => ({ ...e, [key]: err.message }));
    } finally {
      setEnhancingPhoto(e => ({ ...e, [key]: false }));
    }
  };

  const handlePostInstagram = async (listing) => {
    const caption = igCaption[listing.id] ?? generateCaption(listing, 'instagram', getCaptionStyle(listing.id));
    setIgPosting(p => ({ ...p, [listing.id]: true }));
    setIgPostError(e => ({ ...e, [listing.id]: '' }));
    setIgPostSuccess(s => ({ ...s, [listing.id]: '' }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/post-instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caption })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to post to Instagram');
      setIgPostSuccess(s => ({ ...s, [listing.id]: '🚀 Posted to Instagram!' }));
    } catch (err) {
      setIgPostError(e => ({ ...e, [listing.id]: err.message }));
    } finally {
      setIgPosting(p => ({ ...p, [listing.id]: false }));
    }
  };

  const handlePostFacebook = async (listing) => {
    const caption = fbCaption[listing.id] ?? generateCaption(listing, 'facebook', getCaptionStyle(listing.id));
    setFbPosting(p => ({ ...p, [listing.id]: true }));
    setFbPostError(e => ({ ...e, [listing.id]: '' }));
    setFbPostSuccess(s => ({ ...s, [listing.id]: '' }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/post-facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caption })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to post to Facebook');
      setFbPostSuccess(s => ({ ...s, [listing.id]: '🚀 Posted to Facebook!' }));
    } catch (err) {
      setFbPostError(e => ({ ...e, [listing.id]: err.message }));
    } finally {
      setFbPosting(p => ({ ...p, [listing.id]: false }));
    }
  };

  const handlePostLinkedIn = async (listing) => {
    const caption = liCaption[listing.id] ?? generateCaption(listing, 'linkedin', getCaptionStyle(listing.id), null, agent, marketPulse);
    setLiPosting(p => ({ ...p, [listing.id]: true }));
    setLiPostError(e => ({ ...e, [listing.id]: '' }));
    setLiPostSuccess(s => ({ ...s, [listing.id]: '' }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/post-linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caption })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to post to LinkedIn');
      setLiPostSuccess(s => ({ ...s, [listing.id]: '🚀 Posted to LinkedIn!' }));
    } catch (err) {
      setLiPostError(e => ({ ...e, [listing.id]: err.message }));
    } finally {
      setLiPosting(p => ({ ...p, [listing.id]: false }));
    }
  };

  const updateExpanded = (next) => {
    setExpanded(next);
    try {
      if (next) localStorage.setItem(EXPANDED_STORAGE_KEY, next);
      else localStorage.removeItem(EXPANDED_STORAGE_KEY);
    } catch {
      // localStorage unavailable (e.g. private browsing) -- expansion just won't persist, not fatal
    }
    onListingOpen?.(next);
  };

  const getSelectedPlatforms = (listingId) => activePlatform[listingId] || ['facebook'];
  const togglePlatform = (listingId, key) => {
    setActivePlatform(a => {
      const current = a[listingId] || ['facebook'];
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...a, [listingId]: next };
    });
  };
  const getCaptionStyle = (listingId) => captionStyle[listingId] || 'long';
  const getPgLengthKey = (listingId) => pgLength[listingId] || 'full';
  const getPgLengthLimit = (listingId) => (PROPERTYGURU_LENGTHS.find(t => t.key === getPgLengthKey(listingId)) || PROPERTYGURU_LENGTHS[0]).limit;
  const canWebShare = !!navigator.share;
  const activeListings = listings.filter(l => l.status !== 'archived');
  const deletedListings = listings.filter(l => l.status === 'archived');

  return (
    <div className="page-content">
      <div className="page-title">{activeTab === 'deleted' ? 'My Listings — Deleted' : 'My Listings'}</div>

      {activeTab === 'active' && (
        activeListings.length > 0
          ? <div className="page-subtitle">You have {activeListings.length} listing(s).</div>
          : <div className="page-subtitle" style={{ fontStyle: 'italic' }}>No active listings. Go to New Listing to create your first one.</div>
      )}

      {activeTab === 'active' && activeListings.map(l => (
        <div key={l.id} className="listing-card">
          <div className="listing-card-header" onClick={() => {
            const next = expanded === l.id ? null : l.id;
            updateExpanded(next);
          }}>
            <div className="listing-card-title">{l.property_type} — {l.location} — SGD {formatPriceM(l.price)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(l); }}
                title="Edit listing"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
              >
                ✏️
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(l.id); }}
                disabled={deleting[l.id]}
                title="Delete listing"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  opacity: deleting[l.id] ? 0.4 : 0.7,
                  transition: 'opacity 0.2s'
                }}
              >
                🗑️
              </button>
              <div className="listing-card-date">{l.created_at?.slice(0, 10)} {expanded === l.id ? '▲' : '▼'}</div>
            </div>
          </div>

          {expanded === l.id && (
            <div>
              {l.images && l.images.length > 0 && (
                <div style={{ padding: '16px 20px 0' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {l.images.map((url, i) => {
                      const isPosterPhoto = (posterPhotoIndex[l.id] || 0) === i;
                      return (
                        <div key={i} style={{ position: 'relative' }}>
                          <img
                            src={url}
                            alt={`Property ${i + 1}`}
                            onClick={() => setPosterPhotoIndex(p => ({ ...p, [l.id]: i }))}
                            style={{
                              width: '150px', height: '110px', objectFit: 'cover', borderRadius: '4px',
                              border: isPosterPhoto ? '2px solid #F0C84A' : '1px solid rgba(212,175,55,0.3)',
                              cursor: 'pointer'
                            }}
                          />
                          {isPosterPhoto && (
                            <div style={{
                              position: 'absolute', top: '4px', left: '4px',
                              background: 'rgba(240,200,74,0.9)', color: '#1a1a2e',
                              borderRadius: '3px', fontSize: '9px', padding: '2px 6px', fontWeight: 'bold'
                            }}>
                              ★ FEATURED
                            </div>
                          )}
                          <button
                            onClick={() => handleDeletePhoto(l, i)}
                            disabled={deletingPhoto[`${l.id}-${i}`]}
                            title="Remove this photo"
                            style={{
                              position: 'absolute', top: '4px', right: '4px',
                              background: 'rgba(0,0,0,0.7)', border: 'none',
                              color: '#ff6b6b', borderRadius: '50%',
                              width: '20px', height: '20px',
                              cursor: 'pointer', fontSize: '12px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              lineHeight: '1'
                            }}
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(url, `${l.id.slice(0, 8)}-photo-${i + 1}.jpg`)}
                            style={{
                              position: 'absolute', bottom: '4px', right: '4px',
                              background: 'rgba(0,0,0,0.6)', color: '#F0C84A',
                              border: 'none', borderRadius: '3px', fontSize: '10px', padding: '2px 6px',
                              cursor: 'pointer'
                            }}
                          >
                            ⬇ Save
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEnhancePhoto(l, i)}
                            disabled={enhancingPhoto[`${l.id}-${i}`]}
                            title="Auto-enhance this photo (free, replaces it in place)"
                            style={{
                              position: 'absolute', bottom: '4px', left: '4px',
                              background: 'rgba(0,0,0,0.6)', color: '#F0C84A',
                              border: 'none', borderRadius: '3px', fontSize: '10px', padding: '2px 6px',
                              cursor: enhancingPhoto[`${l.id}-${i}`] ? 'not-allowed' : 'pointer',
                              opacity: enhancingPhoto[`${l.id}-${i}`] ? 0.6 : 1
                            }}
                          >
                            {enhancingPhoto[`${l.id}-${i}`] ? '✨...' : '✨ Enhance'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {Object.entries(enhancePhotoError).some(([k, v]) => k.startsWith(`${l.id}-`) && v) && (
                    <div style={{ color: '#e08080', fontSize: '12px', marginBottom: '10px' }}>
                      {Object.entries(enhancePhotoError).find(([k, v]) => k.startsWith(`${l.id}-`) && v)?.[1]}
                    </div>
                  )}
                  <button
                    onClick={() => handleDownloadAll(l)}
                    disabled={downloading[l.id]}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(212,175,55,0.4)',
                      color: '#F0C84A',
                      padding: '8px 16px',
                      borderRadius: '3px',
                      cursor: downloading[l.id] ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontFamily: "'Montserrat', sans-serif",
                      opacity: downloading[l.id] ? 0.5 : 1,
                      marginBottom: '4px'
                    }}
                  >
                    {downloading[l.id] ? 'Preparing ZIP...' : `⬇ Download All ${l.images.length} Photos as ZIP`}
                  </button>
                </div>
              )}

              <div className="listing-card-body">{(l.content || '').replace(/\*\*/g, '').replace(/^#+\s/gm, '').replace(/---/g, '').trim()}</div>

              <MatchingBuyers
                token={token}
                listingId={l.id}
                listingSummary={`${l.property_type} in ${l.location}, SGD ${formatPriceM(l.price)}`}
              />

              <div style={{
                margin: '8px 20px 20px',
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: '4px',
                padding: '16px'
              }}>
                <div className="section-label" style={{ marginBottom: '4px' }}>📲 Share This Listing</div>
                <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '14px' }}>
                  Select a platform and caption style. Copy and paste directly into your own account.
                </div>

                <div style={{
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid rgba(212,175,55,0.15)'
                }}>
                  <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '10px' }}>
                    Branded poster for your post/story. Click a photo above (marked ★ FEATURED) to choose the background — the same photo is also used as the video's background below.
                  </div>

                  {posterTemplates.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '12px', maxWidth: '760px' }}>
                      {posterTemplates.map(t => {
                        const selected = selectedTemplateFor(l) === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPosterTemplateChoice(c => ({ ...c, [l.id]: t.id }))}
                            style={{
                              background: 'transparent',
                              border: `2px solid ${selected ? '#D4AF37' : 'rgba(212,175,55,0.25)'}`,
                              borderRadius: '5px',
                              padding: '5px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '5px'
                            }}
                          >
                            {t.thumbnail_url ? (
                              <img
                                src={t.thumbnail_url}
                                alt={t.name}
                                style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: '3px', display: 'block' }}
                              />
                            ) : (
                              <div style={{ width: '100%', aspectRatio: '4 / 5', borderRadius: '3px', background: 'rgba(212,175,55,0.1)' }} />
                            )}
                            <span style={{
                              color: selected ? '#F0C84A' : 'rgba(248,244,236,0.7)',
                              fontSize: '11px',
                              textAlign: 'center',
                              lineHeight: '1.2'
                            }}>
                              {t.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {l.poster_url && (
                    <div style={{ marginBottom: '10px' }}>
                      <img
                        src={l.poster_url}
                        alt="Branded poster"
                        style={{ maxWidth: '220px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)', display: 'block' }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="btn-primary"
                      style={{ maxWidth: '220px' }}
                      onClick={() => handleGeneratePoster(l)}
                      disabled={posterLoading[l.id]}
                    >
                      {posterLoading[l.id] ? 'Generating...' : l.poster_url ? '🖼️ Regenerate Poster' : '🖼️ Generate Poster'}
                    </button>
                    {l.poster_url && (
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(l.poster_url, `${l.id.slice(0, 8)}-poster.jpg`)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#F0C84A',
                          padding: '10px 16px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          fontFamily: "'Montserrat', sans-serif",
                          cursor: 'pointer'
                        }}
                      >
                        ⬇ Download
                      </button>
                    )}
                  </div>
                  {posterError[l.id] && (
                    <div style={{ color: '#e08080', fontSize: '12px', marginTop: '8px' }}>{posterError[l.id]}</div>
                  )}

                  {videoTemplates.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', marginBottom: '10px' }}>
                      {videoTemplates.map(t => {
                        const selected = selectedVideoTemplateFor(l) === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setVideoTemplateChoice(c => ({ ...c, [l.id]: t.id }))}
                            style={{
                              background: selected ? 'rgba(212,175,55,0.2)' : 'transparent',
                              border: `1px solid ${selected ? '#D4AF37' : 'rgba(212,175,55,0.25)'}`,
                              color: selected ? '#F0C84A' : 'rgba(248,244,236,0.7)',
                              padding: '6px 14px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontFamily: "'Montserrat', sans-serif"
                            }}
                          >
                            {selected ? '✓ ' : ''}{t.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {l.video_url && (
                    <div style={{ marginBottom: '10px' }}>
                      <video
                        src={l.video_url}
                        controls
                        style={{ maxWidth: '220px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)', display: 'block' }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="btn-primary"
                      style={{ maxWidth: '220px' }}
                      onClick={() => handleGenerateVideo(l)}
                      disabled={videoLoading[l.id]}
                    >
                      {videoLoading[l.id] ? 'Generating video... (~1-2 min)' : l.video_url ? '🎬 Regenerate Video' : '🎬 Generate Video'}
                    </button>
                    {l.video_url && (
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(l.video_url, `${l.id.slice(0, 8)}-video.mp4`)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#F0C84A',
                          padding: '10px 16px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          fontFamily: "'Montserrat', sans-serif",
                          cursor: 'pointer'
                        }}
                      >
                        ⬇ Download
                      </button>
                    )}
                  </div>
                  {videoError[l.id] && (
                    <div style={{ color: '#e08080', fontSize: '12px', marginTop: '8px' }}>{videoError[l.id]}</div>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.4)', marginBottom: '6px' }}>
                  Tap to select one or more platforms — each shows its own caption below.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {PLATFORMS.map(p => {
                    const selected = getSelectedPlatforms(l.id).includes(p.key);
                    return (
                      <button
                        key={p.key}
                        onClick={() => togglePlatform(l.id, p.key)}
                        style={{
                          background: selected ? 'rgba(212,175,55,0.25)' : 'transparent',
                          border: `1px solid ${selected ? '#D4AF37' : 'rgba(212,175,55,0.3)'}`,
                          color: selected ? '#F0C84A' : 'rgba(248,244,236,0.6)',
                          padding: '6px 14px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontFamily: "'Montserrat', sans-serif",
                          transition: 'all 0.2s'
                        }}
                      >
                        {selected ? '✓ ' : ''}{p.emoji} {p.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {STYLES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setCaptionStyle(c => ({ ...c, [l.id]: s.key }))}
                      style={{
                        background: getCaptionStyle(l.id) === s.key ? 'rgba(212,175,55,0.15)' : 'transparent',
                        border: `1px solid ${getCaptionStyle(l.id) === s.key ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                        color: getCaptionStyle(l.id) === s.key ? '#F0C84A' : 'rgba(248,244,236,0.5)',
                        padding: '5px 12px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: "'Montserrat', sans-serif",
                        transition: 'all 0.2s'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {PLATFORMS.filter(p => getSelectedPlatforms(l.id).includes(p.key)).map(p => (
                  <div key={p.key} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
                    <div style={{ fontSize: '12px', color: '#F0C84A', fontWeight: 'bold', marginBottom: '8px' }}>
                      {p.emoji} {p.label}
                    </div>

                    {p.key === 'propertyguru' && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        {PROPERTYGURU_LENGTHS.map(t => (
                          <button
                            key={t.key}
                            onClick={() => setPgLength(pl => ({ ...pl, [l.id]: t.key }))}
                            style={{
                              background: getPgLengthKey(l.id) === t.key ? 'rgba(212,175,55,0.2)' : 'transparent',
                              border: `1px solid ${getPgLengthKey(l.id) === t.key ? '#D4AF37' : 'rgba(212,175,55,0.25)'}`,
                              color: getPgLengthKey(l.id) === t.key ? '#F0C84A' : 'rgba(248,244,236,0.5)',
                              padding: '4px 10px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontFamily: "'Montserrat', sans-serif"
                            }}
                          >
                            {t.label} ({t.limit.toLocaleString()})
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(212,175,55,0.2)',
                      borderRadius: '4px',
                      padding: '14px',
                      fontSize: '12px',
                      color: 'rgba(248,244,236,0.85)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginBottom: '12px',
                      lineHeight: '1.6'
                    }}>
                      {generateCaption(l, p.key, getCaptionStyle(l.id), getPgLengthLimit(l.id), agent, marketPulse)}
                    </div>

                    {p.key === 'propertyguru' && (
                      <div style={{ fontSize: '10.5px', color: 'rgba(248,244,236,0.45)', marginTop: '-6px', marginBottom: '12px' }}>
                        {generateCaption(l, p.key, getCaptionStyle(l.id), getPgLengthLimit(l.id), agent, marketPulse).length.toLocaleString()} / {getPgLengthLimit(l.id).toLocaleString()} characters
                        {generateCaption(l, p.key, getCaptionStyle(l.id), getPgLengthLimit(l.id), agent, marketPulse).length >= getPgLengthLimit(l.id) && ' — trimmed to fit this length, double-check before posting'}
                      </div>
                    )}

                    {p.key !== 'whatsapp' && (
                      <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.5)', marginBottom: '10px' }}>
                        1. Copy the caption above &nbsp;→&nbsp; 2. Click below to open {p.label} &nbsp;→&nbsp; 3. Paste it into a new post and attach your photos there.
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className="btn-primary"
                        style={{ maxWidth: '180px' }}
                        onClick={() => handleCopy(l.id, p.key, generateCaption(l, p.key, getCaptionStyle(l.id), getPgLengthLimit(l.id), agent, marketPulse))}
                      >
                        {copied[`${l.id}-${p.key}`] ? '✅ Copied!' : '📋 Copy Caption'}
                      </button>

                      {canWebShare && (
                        <button
                          onClick={() => handleWebShare(l, p.key, generateCaption(l, p.key, getCaptionStyle(l.id), getPgLengthLimit(l.id), agent, marketPulse))}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(212,175,55,0.4)',
                            color: '#F0C84A',
                            padding: '10px 16px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontFamily: "'Montserrat', sans-serif"
                          }}
                        >
                          {shareStatus[`${l.id}-${p.key}`] || '📤 Share'}
                        </button>
                      )}

                      <a
                        href={p.key === 'whatsapp' ? buildWhatsAppShareUrl(l, generateCaption(l, p.key, getCaptionStyle(l.id), getPgLengthLimit(l.id), agent, marketPulse)) : p.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#F0C84A',
                          padding: '10px 20px',
                          borderRadius: '3px',
                          fontSize: '13px',
                          fontFamily: "'Montserrat', sans-serif",
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {p.key === 'whatsapp' ? `${p.emoji} Share via WhatsApp` : `${p.emoji} Go to ${p.label} & Paste`}
                      </a>
                    </div>

                    {p.key === 'instagram' && agent.can_use_instagram_beta && agent.instagram_username && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
                        <label className="form-label">Post directly to Instagram (@{agent.instagram_username})</label>
                        <textarea
                          className="form-textarea"
                          rows={4}
                          value={igCaption[l.id] ?? generateCaption(l, 'instagram', getCaptionStyle(l.id))}
                          onChange={e => setIgCaption(c => ({ ...c, [l.id]: e.target.value }))}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-gold"
                            style={{ maxWidth: '220px' }}
                            onClick={() => handlePostInstagram(l)}
                            disabled={igPosting[l.id] || !l.poster_url}
                          >
                            {igPosting[l.id] ? 'Posting...' : '🚀 Post to Instagram'}
                          </button>
                          {!l.poster_url && (
                            <span style={{ fontSize: '11px', color: 'rgba(248,244,236,0.5)' }}>Generate a poster above first</span>
                          )}
                        </div>
                        {igPostError[l.id] && <div className="error-msg">{igPostError[l.id]}</div>}
                        {igPostSuccess[l.id] && <div className="success-msg">{igPostSuccess[l.id]}</div>}
                      </div>
                    )}

                    {p.key === 'facebook' && agent.can_use_facebook_beta && agent.fb_page_name && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
                        <label className="form-label">Post directly to Facebook ({agent.fb_page_name})</label>
                        <textarea
                          className="form-textarea"
                          rows={4}
                          value={fbCaption[l.id] ?? generateCaption(l, 'facebook', getCaptionStyle(l.id))}
                          onChange={e => setFbCaption(c => ({ ...c, [l.id]: e.target.value }))}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-gold"
                            style={{ maxWidth: '220px' }}
                            onClick={() => handlePostFacebook(l)}
                            disabled={fbPosting[l.id] || !l.poster_url}
                          >
                            {fbPosting[l.id] ? 'Posting...' : '🚀 Post to Facebook'}
                          </button>
                          {!l.poster_url && (
                            <span style={{ fontSize: '11px', color: 'rgba(248,244,236,0.5)' }}>Generate a poster above first</span>
                          )}
                        </div>
                        {fbPostError[l.id] && <div className="error-msg">{fbPostError[l.id]}</div>}
                        {fbPostSuccess[l.id] && <div className="success-msg">{fbPostSuccess[l.id]}</div>}
                      </div>
                    )}

                    {p.key === 'linkedin' && agent.can_use_linkedin_beta && agent.linkedin_name && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
                        <label className="form-label">Post directly to LinkedIn ({agent.linkedin_name})</label>
                        <textarea
                          className="form-textarea"
                          rows={4}
                          value={liCaption[l.id] ?? generateCaption(l, 'linkedin', getCaptionStyle(l.id), null, agent, marketPulse)}
                          onChange={e => setLiCaption(c => ({ ...c, [l.id]: e.target.value }))}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-gold"
                            style={{ maxWidth: '220px' }}
                            onClick={() => handlePostLinkedIn(l)}
                            disabled={liPosting[l.id]}
                          >
                            {liPosting[l.id] ? 'Posting...' : '🚀 Post to LinkedIn'}
                          </button>
                          {!l.poster_url && (
                            <span style={{ fontSize: '11px', color: 'rgba(248,244,236,0.5)' }}>No poster yet — will post text only</span>
                          )}
                        </div>
                        {liPostError[l.id] && <div className="error-msg">{liPostError[l.id]}</div>}
                        {liPostSuccess[l.id] && <div className="success-msg">{liPostSuccess[l.id]}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {activeTab === 'deleted' && (
        deletedListings.length > 0
          ? <div className="page-subtitle">You have {deletedListings.length} deleted listing(s).</div>
          : <div className="page-subtitle" style={{ fontStyle: 'italic' }}>Nothing here. Anything you delete from Active Listings will show up here.</div>
      )}

      {activeTab === 'deleted' && deletedListings.map(l => (
        <div key={l.id} className="listing-card">
          <div className="listing-card-header" onClick={() => {
            const next = expanded === l.id ? null : l.id;
            updateExpanded(next);
          }}>
            <div className="listing-card-title">{l.property_type} — {l.location} — SGD {formatPriceM(l.price)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); handleRestore(l.id); }}
                disabled={restoring[l.id]}
                title="Restore to Active Listings"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: '#F0C84A',
                  padding: '4px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: "'Montserrat', sans-serif",
                  opacity: restoring[l.id] ? 0.5 : 1
                }}
              >
                {restoring[l.id] ? 'Restoring...' : '↺ Restore'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemovePermanently(l.id); }}
                disabled={removingPermanently[l.id]}
                title="Remove permanently"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  opacity: removingPermanently[l.id] ? 0.4 : 0.7,
                  transition: 'opacity 0.2s'
                }}
              >
                🗑️
              </button>
              <div className="listing-card-date">{l.created_at?.slice(0, 10)} {expanded === l.id ? '▲' : '▼'}</div>
            </div>
          </div>

          {expanded === l.id && (
            <div className="listing-card-body">
              {removePermanentlyError[l.id] && <div className="error-msg">{removePermanentlyError[l.id]}</div>}
              {l.images && l.images.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {l.images.slice(0, 5).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Property ${i + 1}`}
                      style={{ width: '110px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }}
                    />
                  ))}
                </div>
              )}
              {(l.content || '').replace(/\*\*/g, '').replace(/^#+\s/gm, '').replace(/---/g, '').trim()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
