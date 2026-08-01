import React, { useState, useRef, useEffect } from 'react';
import { millionsToFullNumber, fullNumberToMillions } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';
const STORAGE_KEY = 'nestlist_new_listing_form';

const DEFAULT_FORM = {
  property_type: 'Good Class Bungalow (GCB)', location: '', land_size: 0,
  built_up: 0, bedrooms: '', bathrooms: '', price: '', features: '',
  plot_width: 0, plot_depth: 0, storeys: 0, site_coverage: 0,
  sg_citizen: true
};

export default function NewListing({ agent, token, editingListing, onDoneEditing }) {
  const isEditing = !!editingListing;
  const isConvertingSeller = isEditing && editingListing.status === 'lead';
  const [form, setForm] = useState(() => {
    if (editingListing) {
      return {
        property_type: editingListing.property_type || DEFAULT_FORM.property_type,
        location: editingListing.location || '',
        land_size: editingListing.land_size || 0,
        built_up: editingListing.built_up || 0,
        bedrooms: editingListing.bedrooms || '',
        bathrooms: editingListing.bathrooms || '',
        price: editingListing.price ? fullNumberToMillions(editingListing.price) : '',
        features: editingListing.features || '',
        plot_width: editingListing.plot_width || 0,
        plot_depth: editingListing.plot_depth || 0,
        storeys: editingListing.storeys || 0,
        site_coverage: editingListing.site_coverage || 0,
        sg_citizen: true
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_FORM;
    } catch {
      return DEFAULT_FORM;
    }
  });
  const [declaration, setDeclaration] = useState(isEditing);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageSuccess, setImageSuccess] = useState('');
  const [abortController, setAbortController] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoLoadingLabel, setPhotoLoadingLabel] = useState('Uploading photos...');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState([]);
  const [propertyTypeInvalid, setPropertyTypeInvalid] = useState(false);
  const fileRef = useRef();
  const photoRef = useRef();

  // Persist form to localStorage whenever it changes (skip while editing an existing listing)
  useEffect(() => {
    if (isEditing) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form, isEditing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // sg_citizen defaults to true - GCB/landed purchases are Singapore Citizens only

  const clearForm = () => {
    setForm(DEFAULT_FORM);
    localStorage.removeItem(STORAGE_KEY);
    setDeclaration(false);
    setResult(null);
    setError('');
    setPhotoSuccess('');
    setPhotoError('');
    setUploadedPhotoUrls([]);
    setImagePreviews([]);
    setImageSuccess('');
    if (fileRef.current) fileRef.current.value = '';
    if (photoRef.current) photoRef.current.value = '';
  };

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
      setImagePreviews(files.map(f => URL.createObjectURL(f)));
      const response = await fetch(`${API}/api/extract-listing-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const extracted = await response.json();
      if (!response.ok) throw new Error(extracted.detail || 'Failed to read image');
      if (extracted.price) extracted.price = fullNumberToMillions(extracted.price);
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
    setImagePreviews([]);
    setImageSuccess('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files).slice(0, 15);
    if (!files.length) return;
    if (!result || !result.listing) {
      setPhotoError('Please generate a listing first before uploading photos.');
      return;
    }
    setPhotoLoading(true);
    setPhotoSuccess('');
    setPhotoError('');
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

      const pdfFiles = files.filter(f => f.type === 'application/pdf');
      const imageFiles = files.filter(f => f.type !== 'application/pdf');

      const imageResults = await Promise.all(imageFiles.map(readFile));

      let pdfExtractedImages = [];
      if (pdfFiles.length > 0) {
        setPhotoLoadingLabel(pdfFiles.length > 1 ? 'Extracting photos from PDFs...' : 'Extracting photos from PDF...');
        const pdfReads = await Promise.all(pdfFiles.map(readFile));
        const perPdfResults = await Promise.all(pdfReads.map(async ({ image_data }) => {
          const res = await fetch(`${API}/api/listings/extract-pdf-photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ pdf_data: image_data })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Failed to extract photos from PDF');
          return data.images;
        }));
        pdfExtractedImages = perPdfResults.flat();
        setPhotoLoadingLabel('Uploading photos...');
      }

      const images = [...imageResults, ...pdfExtractedImages].slice(0, 15);
      if (!images.length) throw new Error('No photos found to upload.');

      const response = await fetch(`${API}/api/listings/${result.listing.id}/upload-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ images })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to upload photos');
      setUploadedPhotoUrls(data.image_urls);
      const pdfNote = pdfExtractedImages.length > 0 ? ` (${pdfExtractedImages.length} extracted from PDF)` : '';
      setPhotoSuccess(`${images.length} photo${images.length > 1 ? 's' : ''} uploaded successfully!${pdfNote}`);
    } catch (err) {
      setPhotoError(`Failed to upload photos: ${err.message}`);
    } finally {
      setPhotoLoading(false);
      setPhotoLoadingLabel('Uploading photos...');
    }
  };

  const removeUploadedPhoto = (indexToRemove) => {
    setUploadedPhotoUrls(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.property_type) {
      setPropertyTypeInvalid(true);
      setError('Please select a property type before continuing.');
      return;
    }
    if (!declaration) { setError('Please tick the declaration box.'); return; }
    setPropertyTypeInvalid(false);
    setError(''); setLoading(true); setResult(null); setSaveSuccess('');
    const payload = { ...form, price: millionsToFullNumber(form.price) };
    try {
      if (isEditing) {
        const res = await fetch(`${API}/api/listings/${editingListing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error saving listing');
        setSaveSuccess('Listing updated!');
        setTimeout(() => onDoneEditing && onDoneEditing(), 900);
        return;
      }
      const res = await fetch(`${API}/api/listings/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
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

  const propertyTypes = [
    'Good Class Bungalow (GCB)', 'Detached/Bungalow', 'Semi-Detached',
    'Inter-Terrace', 'Corner Terrace', 'Penthouse'
  ];

  return (
    <div className="page-content">
      <div className="page-title">{isConvertingSeller ? 'Convert to Listing' : isEditing ? 'Edit Listing' : 'Submit New Listing'}</div>
      <div className="page-subtitle">
        {isConvertingSeller
          ? 'Fill in the remaining details, then save to publish this as a live listing.'
          : isEditing ? 'Update the details below and save your changes.' : 'Fill in the details below. Claude will write your personalised listing automatically.'}
      </div>

      {/* Saved form notice */}
      {!isEditing && (form.location || form.price || form.features) && !result && (
        <div style={{
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: '4px',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '12px',
          color: 'rgba(248,244,236,0.65)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Your previous listing details have been restored.</span>
          <button
            type="button"
            onClick={clearForm}
            style={{
              background: 'transparent',
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#F0C84A',
              padding: '4px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: "'Montserrat', sans-serif"
            }}
          >
            Clear and Start Fresh
          </button>
        </div>
      )}

      {/* Smart Fill */}
      {!isEditing && <div style={{
        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '4px', padding: '20px 24px', marginBottom: '24px'
      }}>
        <div className="section-label" style={{ marginBottom: '10px' }}>Smart Fill - Upload Property Screenshots</div>
        <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.65)', marginBottom: '14px' }}>
          Upload up to 5 screenshots of any property listing. Claude will read them all and fill in the form fields automatically.
        </div>
        <input type="file" accept="image/*" ref={fileRef} multiple style={{ display: 'none' }} onChange={handleImageUpload} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn-gold" type="button" style={{ maxWidth: '320px' }}
            onClick={() => fileRef.current.click()} disabled={imageLoading}
          >
            {imageLoading ? <><span className="spinner" />Reading images...</> : 'Upload Property Screenshots (up to 5)'}
          </button>
          {imageLoading && (
            <button
              type="button" onClick={cancelImageUpload}
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
        {imagePreviews.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {imagePreviews.map((src, i) => (
              <img key={i} src={src} alt={`Uploaded ${i + 1}`}
                style={{ maxWidth: '150px', maxHeight: '120px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }} />
            ))}
          </div>
        )}
        {imageSuccess && <div className="success-msg" style={{ marginTop: '12px' }}>{imageSuccess}</div>}
        {imageSuccess && (
          <button
            type="button" onClick={clearImages}
            style={{
              marginTop: '8px', background: 'transparent',
              border: '1px solid rgba(212,175,55,0.5)', color: '#F0C84A',
              padding: '6px 14px', borderRadius: '3px', cursor: 'pointer',
              fontSize: '12px', fontFamily: "'Montserrat', sans-serif"
            }}
          >
            Clear and Upload New Images
          </button>
        )}
      </div>}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <div className="form-group">
              <label className="form-label">1. Property Type</label>
              <select
                className={`form-select${propertyTypeInvalid || (imageSuccess && !form.property_type) ? ' invalid' : ''}`}
                value={form.property_type}
                onChange={e => { set('property_type', e.target.value); setPropertyTypeInvalid(false); }}
                required
              >
                <option value="" disabled>-- Select Property Type --</option>
                {propertyTypes.map(t => <option key={t}>{t}</option>)}
              </select>
              {imageSuccess && !form.property_type && (
                <div className="error-msg" style={{ marginTop: '6px' }}>
                  Your screenshots didn't state a property type — please select the correct one yourself before continuing.
                </div>
              )}
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
              <label className="form-label">4. Plot Width / Frontage</label>
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
              <label className="form-label">7. Bedrooms</label>
              <input className="form-input" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} placeholder="e.g. 4" required />
            </div>
            <div className="form-group">
              <label className="form-label">7b. Bathrooms</label>
              <input className="form-input" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} placeholder="e.g. 4" />
            </div>
            <div className="form-group">
              <label className="form-label">8. Asking Price (SGD, in Millions)</label>
              <input className="form-input" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 25.7" required />
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

        {!isEditing && (
          <div className="form-checkbox">
            <input type="checkbox" id="declaration" checked={declaration} onChange={e => setDeclaration(e.target.checked)} />
            <label htmlFor="declaration">I confirm all details are accurate and truthful.</label>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}
        {saveSuccess && <div className="success-msg">{saveSuccess}</div>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="button" onClick={isEditing ? onDoneEditing : clearForm}
            style={{
              background: 'transparent', border: '1px solid rgba(212,175,55,0.5)',
              color: '#F0C84A', padding: '10px 20px', borderRadius: '3px',
              cursor: 'pointer', fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
            }}
          >
            {isEditing ? 'Cancel' : 'Clear Form'}
          </button>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading
              ? <><span className="spinner" />{isEditing ? 'Saving...' : 'Generating your listing...'}</>
              : (isConvertingSeller ? '🏡 Publish as Listing' : isEditing ? 'Save Changes' : 'Generate My Listing Automatically')}
          </button>
        </div>
      </form>

      {!isEditing && result && (
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
              <div className="section-label">Step 3 - Upload Property Photos</div>
              <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.65)', marginBottom: '14px' }}>
                Upload up to 15 property photos, or a PDF brochure/marketing kit -- every photo inside it is
                extracted automatically. These will be saved to your listing and used for social media posts.
              </div>
              <input type="file" accept="image/*,application/pdf" ref={photoRef} multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <button
                className="btn-gold" type="button" style={{ maxWidth: '320px' }}
                onClick={() => photoRef.current.click()} disabled={photoLoading}
              >
                {photoLoading ? <><span className="spinner" />{photoLoadingLabel}</> : 'Upload Property Photos or PDF'}
              </button>

              {photoError && <div className="error-msg" style={{ marginTop: '12px' }}>{photoError}</div>}
              {photoSuccess && <div className="success-msg" style={{ marginTop: '12px' }}>{photoSuccess}</div>}

              {uploadedPhotoUrls.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {uploadedPhotoUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img
                        src={url} alt={`Property ${i + 1}`}
                        style={{ width: '150px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeUploadedPhoto(i)}
                        title="Remove this photo"
                        style={{
                          position: 'absolute', top: '4px', right: '4px',
                          background: 'rgba(0,0,0,0.7)', border: 'none',
                          color: '#ff6b6b', borderRadius: '50%',
                          width: '22px', height: '22px',
                          cursor: 'pointer', fontSize: '14px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Montserrat', sans-serif",
                          lineHeight: '1'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="divider" />
              <div className="success-msg">
                Your listing is complete! Head to <strong>My Listings</strong> in the sidebar to view it and share it on social media.
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
