import React, { useState, useRef } from 'react';

const API = process.env.REACT_APP_API_URL || '';

export default function NewListing({ agent, token }) {
  const [form, setForm] = useState({
    property_type: 'Good Class Bungalow (GCB)', location: '', land_size: 0,
    built_up: 0, bedrooms: '', price: '', features: '',
    plot_width: 0, plot_depth: 0, storeys: 0, site_coverage: 0,
    sg_citizen: false
  });
  const [declaration, setDeclaration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbResult, setFbResult] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageSuccess, setImageSuccess] = useState('');
  const [abortController, setAbortController] = useState(null);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    if (!files.length) return;

    setImageLoading(true);
    setImageSuccess('');
    setError('');

    const controller = new AbortController();
    setAbortController(controller);

    const timeout = setTimeout(() => {
      controller.abort();
      setImageLoading(false);
      setError('Image reading timed out. Please try again or fill in the form manually.');
    }, 60000);

    try {
      const readFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({
          image_data: ev.target.result.split(',')[1],
          media_type: file.type
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const images = await Promise.all(files.map(readFile));
      setImagePreview(URL.createObjectURL(files[0]));

      const response = await fetch(`${API}/api/extract-listing-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const extracted = await response.json();
      if (!response.ok) throw new Error(extracted.detail || 'Failed to read image');
      setForm(f => ({ ...f, ...extracted }));
      setImageSuccess(`Details extracted from ${files.length} image${files.length > 1 ? 's' : ''}! Please review and adjust if needed.`);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name !== 'AbortError') {
        setError('Could not read image. Please fill in the form manually.');
      }
    } finally {
      setImageLoading(false);
      setAbortController(null);
    }
  };

  const cancelImageUpload = () => {
    if (abortController) {
      abortController.abort();
      setImageLoading(false);
      setAbortController(null);
      setError('Image reading cancelled.');
    }
  };

  const clearImages = () => {
    setImagePreview(null);
    setImageSuccess('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!declaration) { setError('Please tick the declaration box.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/api/listings/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error generating listing');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const postToFacebook = async () => {
    setFbLoading(true); setFbResult('');
    try {
      const res = await fetch(`${API}/api/listings/${result.listing.id}/post-facebook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Post failed');
      setFbResult(`Posted to Facebook! Post ID: ${data.post_id}`);
    } catch (err) {
      setFbResult(`Failed: ${err.message}`);
    } finally {
      setFbLoading(false);
    }
  };

  const propertyTypes = ['Good Class Bungalow (GCB)', 'Landed Bungalow', 'Semi-Detached', 'Terrace House', 'Penthouse', 'Ultra Luxury Investment Property', 'HDB Flat', 'Condominium'];

  return (
    <div className="page-content">
      <div className="page-title">Submit New Listing</div>
      <div className="page-subtitle">Fill in the details below. Claude will write your personalised listing automatically.</div>

      <div style={{
        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '4px', padding: '20px 24px', marginBottom: '24px'
      }}>
        <div className="section-label" style={{marginBottom:'10px'}}>Smart Fill - Upload Property Screenshots</div>
        <div style={{fontSize:'13px', color:'rgba(248,244,236,0.65)', marginBottom:'14px'}}>
          Upload up to 5 screenshots of any property listing. Claude will read them all and fill in the form fields automatically.
        </div>
        <input
          type="file" accept="image/*" ref={fileRef} multiple
          style={{display:'none'}} onChange={handleImageUpload}
        />
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <button
            className="btn-gold" type="button"
            style={{maxWidth:'320px'}}
            onClick={() => fileRef.current.click()}
            disabled={imageLoading}
          >
            {imageLoading ? <><span className="spinner" />Reading images...</> : 'Upload Property Screenshots (up to 5)'}
          </button>
          {imageLoading && (
            <button
              type="button"
              onClick={cancelImageUpload}
              style={{
                background: 'transparent', border: '1px solid rgba(255,107,107,0.5)',
                color: '#ff6b6b', padding: '8px 16px', borderRadius: '3px',
                cursor: 'pointer', fontSize: '12px', fontFamily: "'Montserrat', sans-serif"
              }}
            >
              Cancel
            </button>
          )}
        </div>
        {imagePreview && (
          <div style={{marginTop:'12px'}}>
            <img src={imagePreview} alt="Uploaded" style={{maxWidth:'200px', maxHeight:'150px', borderRadius:'4px', border:'1px solid rgba(212,175,55,0.3)'}} />
          </div>
        )}
        {imageSuccess && <div className="success-msg" style={{marginTop:'12px'}}>{imageSuccess}</div>}
        {imageSuccess && (
          <button
            type="button"
            onClick={clearImages}
            style={{
              marginTop:'8px', background:'transparent',
              border:'1px solid rgba(212,175,55,0.5)', color:'#F0C84A',
              padding:'6px 14px', borderRadius:'3px', cursor:'pointer',
              fontSize:'12px', fontFamily:"'Montserrat', sans-serif"
            }}
          >
            Clear and Upload New Images
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <div className="form-group">
              <label className="form-label">1. Property Type</label>
              <select className="form-select" value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {propertyTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">2. Location</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Nassim Road, District 10" required />
            </div>
            <div className="form-group">
              <label className="form-label">3. Land Size (sqft)</label>
              <input className="form-input" type="number" value={form.land_size} onChange={e => set('land_size', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">4. Plot Width (metres)</label>
              <input className="form-input" type="number" step="0.1" value={form.plot_width} onChange={e => set('plot_width', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">5. Plot Depth (metres)</label>
              <input className="form-input" type="number" step="0.1" value={form.plot_depth} onChange={e => set('plot_depth', +e.target.value)} />
            </div>
          </div>
          <div>
            <div className="form-group">
              <label className="form-label">6. Built-up Size (sqft)</label>
              <input className="form-input" type="number" value={form.built_up} onChange={e => set('built_up', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">7. Bedrooms and Bathrooms</label>
              <input className="form-input" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} placeholder="e.g. 4 bedrooms, 4 bathrooms" required />
            </div>
            <div className="form-group">
              <label className="form-label">8. Asking Price (SGD)</label>
              <input className="form-input" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 25,700,000" required />
            </div>
            <div className="form-group">
              <label className="form-label">9. Number of Storeys</label>
              <input className="form-input" type="number" value={form.storeys} onChange={e => set('storeys', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">10. Site Coverage (%)</label>
              <input className="form-input" type="number" step="0.1" value={form.site_coverage} onChange={e => set('site_coverage', +e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Special Features</label>
          <textarea className="form-textarea" value={form.features} onChange={e => set('features', e.target.value)} placeholder="e.g. Private pool, 3-car garage, newly renovated" />
        </div>

        <div className="form-checkbox">
          <input type="checkbox" id="sg_citizen" checked={form.sg_citizen} onChange={e => set('sg_citizen', e.target.checked)} />
          <label htmlFor="sg_citizen">I confirm the buyer is a Singapore Citizen (required for GCB purchases)</label>
        </div>
        <div className="form-checkbox">
          <input type="checkbox" id="declaration" checked={declaration} onChange={e => setDeclaration(e.target.checked)} />
          <label htmlFor="declaration">I confirm all details are accurate and truthful.</label>
        </div>

        {error && <div className="error-msg">{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{marginTop:'16px'}}>
          {loading ? <><span className="spinner" />Generating your listing...</> : 'Generate My Listing Automatically'}
        </button>
      </form>

      {result && (
        <>
          <div className="divider" />
          <div className="section-label">Step 1 - URA Compliance Check</div>
          {result.compliance.passed.map((p, i) => <div key={i} className="compliance-item compliance-pass">{p}</div>)}
          {result.compliance.warnings.map((w, i) => <div key={i} className="compliance-item compliance-warn">{w}</div>)}
          {result.compliance.issues.map((e, i) => <div key={i} className="compliance-item compliance-fail">{e}</div>)}

          {result.listing && (
            <>
              <div className="divider" />
              <div className="section-label">Step 2 - Your Listing is Ready</div>
              <div className="listing-output">
                <div className="listing-text">{result.listing.content}</div>
              </div>
              <div className="divider" />
              <div className="section-label">Step 3 - Post to Facebook</div>
              <button className="btn-gold" style={{maxWidth:'320px'}} onClick={postToFacebook} disabled={fbLoading}>
                {fbLoading ? <><span className="spinner" />Posting...</> : 'Post to NestList Facebook Page'}
              </button>
              {fbResult && <div className={fbResult.startsWith('Posted') ? 'success-msg' : 'error-msg'} style={{marginTop:'12px'}}>{fbResult}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}

