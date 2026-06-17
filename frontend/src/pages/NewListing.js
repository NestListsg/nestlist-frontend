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
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageLoading(true);
    setImageSuccess('');
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        const mediaType = file.type;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64 }
                },
                {
                  type: 'text',
                  text: `Extract property listing details from this image and return ONLY a JSON object with these exact fields:
{
  "property_type": "one of: Good Class Bungalow (GCB), Landed Bungalow, Semi-Detached, Terrace House, Penthouse, Ultra Luxury Investment Property, HDB Flat, Condominium",
  "location": "full address or area",
  "land_size": number in sqft or 0,
  "built_up": number in sqft or 0,
  "bedrooms": "e.g. 4 bedrooms, 3 bathrooms",
  "price": "e.g. 25,000,000",
  "features": "special features as comma separated text",
  "plot_width": number in metres or 0,
  "plot_depth": number in metres or 0,
  "storeys": number or 0,
  "site_coverage": number as percentage or 0
}
Return only valid JSON, nothing else.`
                }
              ]
            }]
          })
        });
        const data = await response.json();
        const text = data.content[0].text.trim();
        const clean = text.replace(/```json|```/g, '').trim();
        const extracted = JSON.parse(clean);
        setForm(f => ({ ...f, ...extracted }));
        setImageSuccess('✅ Details extracted successfully! Please review and adjust if needed.');
        setImageLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Could not read image. Please fill in the form manually.');
      setImageLoading(false);
    }
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
      setFbResult(`✅ Posted to Facebook! Post ID: ${data.post_id}`);
    } catch (err) {
      setFbResult(`❌ Failed: ${err.message}`);
    } finally {
      setFbLoading(false);
    }
  };

  const propertyTypes = ['Good Class Bungalow (GCB)', 'Landed Bungalow', 'Semi-Detached', 'Terrace House', 'Penthouse', 'Ultra Luxury Investment Property', 'HDB Flat', 'Condominium'];

  return (
    <div className="page-content">
      <div className="page-title">Submit New Listing</div>
      <div className="page-subtitle">Fill in the details below. Claude will write your personalised listing automatically.</div>

      {/* AI IMAGE UPLOAD SECTION */}
      <div style={{
        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '4px', padding: '20px 24px', marginBottom: '24px'
      }}>
        <div className="section-label" style={{marginBottom:'10px'}}>✨ Smart Fill — Upload a Property Screenshot</div>
        <div style={{fontSize:'13px', color:'rgba(248,244,236,0.65)', marginBottom:'14px'}}>
          Upload a screenshot or photo of any property listing. Claude will read it and fill in the form fields automatically.
        </div>
        <input
          type="file" accept="image/*" ref={fileRef}
          style={{display:'none'}} onChange={handleImageUpload}
        />
        <button
          className="btn-gold" type="button"
          style={{maxWidth:'280px', marginBottom: imagePreview ? '14px' : '0'}}
          onClick={() => fileRef.current.click()}
          disabled={imageLoading}
        >
          {imageLoading ? <><span className="spinner" />Reading image...</> : '📷 Upload Property Screenshot'}
        </button>
        {imagePreview && (
          <div style={{marginTop:'12px'}}>
            <img src={imagePreview} alt="Uploaded" style={{maxWidth:'200px', maxHeight:'150px', borderRadius:'4px', border:'1px solid rgba(212,175,55,0.3)'}} />
          </div>
        )}
        {imageSuccess && <div className="success-msg" style={{marginTop:'12px'}}>{imageSuccess}</div>}
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
              <label className="form-label">7. Bedrooms & Bathrooms</label>
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
          <div className="section-label">Step 1 — URA Compliance Check</div>
          {result.compliance.passed.map((p, i) => <div key={i} className="compliance-item compliance-pass">✅ {p}</div>)}
          {result.compliance.warnings.map((w, i) => <div key={i} className="compliance-item compliance-warn">⚠️ {w}</div>)}
          {result.compliance.issues.map((e, i) => <div key={i} className="compliance-item compliance-fail">❌ {e}</div>)}

          {result.listing && (
            <>
              <div className="divider" />
              <div className="section-label">Step 2 — Your Listing is Ready</div>
              <div className="listing-output">
                <div className="listing-text">{result.listing.content}</div>
              </div>
              <div className="divider" />
              <div className="section-label">Step 3 — Post to Facebook</div>
              <button className="btn-gold" style={{maxWidth:'320px'}} onClick={postToFacebook} disabled={fbLoading}>
                {fbLoading ? <><span className="spinner" />Posting...</> : 'Post to NestList Facebook Page'}
              </button>
              {fbResult && <div className={fbResult.startsWith('✅') ? 'success-msg' : 'error-msg'} style={{marginTop:'12px'}}>{fbResult}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}
