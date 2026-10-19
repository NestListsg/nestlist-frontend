import React, { useState, useRef, useEffect } from 'react';
import { millionsToFullNumber, fullNumberToMillions } from '../utils/format';
import { genUploadSession } from '../utils/uploadSession';
import { PRESTIGE_TYPES, CONDO_FAMILY_TYPES, isCondoFamilyType, isCondoOnly } from '../utils/propertyTypes';

const API = process.env.REACT_APP_API_URL || '';
const STORAGE_KEY = 'nestlist_new_listing_form';
// PLACEHOLDER: backend is building a photo-staging endpoint that uploads the
// listing's property photos before the listing itself exists and hands back
// their URLs, so those URLs can ride along in the /api/listings/generate
// call. Path and response shape below are guesses pending the orchestrator
// relaying the confirmed contract -- this constant (and the response field
// read in handleStagePhotos) are the only things that need to change.
const STAGE_PHOTOS_PATH = '/api/listings/stage-photos';

// Singapore's 28 postal districts, with short area hints for usability.
// Stored form value is just the district number as a string ("1".."28"),
// "" meaning unset -- the agent picks it (or Smart Fill pre-selects it), we
// never try to derive it from the street ourselves.
const SG_DISTRICTS = [
  { value: '1', label: 'District 1 — Raffles Place / Marina / Cecil' },
  { value: '2', label: 'District 2 — Tanjong Pagar / Anson' },
  { value: '3', label: 'District 3 — Queenstown / Tiong Bahru' },
  { value: '4', label: 'District 4 — Sentosa / Harbourfront' },
  { value: '5', label: 'District 5 — Buona Vista / West Coast / Clementi' },
  { value: '6', label: 'District 6 — City Hall / Clarke Quay' },
  { value: '7', label: 'District 7 — Bugis / Beach Road' },
  { value: '8', label: 'District 8 — Little India / Farrer Park' },
  { value: '9', label: 'District 9 — Orchard / River Valley' },
  { value: '10', label: 'District 10 — Bukit Timah / Holland' },
  { value: '11', label: 'District 11 — Novena / Thomson / Watten Estate' },
  { value: '12', label: 'District 12 — Toa Payoh / Balestier / Serangoon' },
  { value: '13', label: 'District 13 — Macpherson / Potong Pasir' },
  { value: '14', label: 'District 14 — Geylang / Paya Lebar / Eunos' },
  { value: '15', label: 'District 15 — Katong / Marine Parade / Siglap' },
  { value: '16', label: 'District 16 — Bedok / Upper East Coast' },
  { value: '17', label: 'District 17 — Changi / Loyang' },
  { value: '18', label: 'District 18 — Tampines / Pasir Ris' },
  { value: '19', label: 'District 19 — Hougang / Punggol / Sengkang' },
  { value: '20', label: 'District 20 — Bishan / Ang Mo Kio' },
  { value: '21', label: 'District 21 — Clementi Park / Upper Bukit Timah' },
  { value: '22', label: 'District 22 — Jurong / Boon Lay' },
  { value: '23', label: 'District 23 — Bukit Panjang / Choa Chu Kang / Hillview' },
  { value: '24', label: 'District 24 — Lim Chu Kang / Tengah' },
  { value: '25', label: 'District 25 — Kranji / Woodlands' },
  { value: '26', label: 'District 26 — Upper Thomson / Springleaf' },
  { value: '27', label: 'District 27 — Yishun / Sembawang' },
  { value: '28', label: 'District 28 — Seletar / Yio Chu Kang' }
];

const DEFAULT_FORM = {
  // property_types is the source of truth (an agent can pick one OR MORE);
  // property_type is kept in lock-step as the PRIMARY = first selected, for
  // backward compatibility and the URA compliance check which read a single
  // type. A single-type listing is just a list of one.
  property_types: ['Good Class Bungalow (GCB)'],
  property_type: 'Good Class Bungalow (GCB)', location: '', district: '', land_size: 0,
  built_up: 0, bedrooms: '', bathrooms: '', price: '', features: '',
  plot_width: 0, plot_depth: 0, storeys: 0, site_coverage: 0,
  sg_citizen: true, code: '',
  // NestList Home (condo family) -- only shown, and only sent with values,
  // when a Condominium / EC / Apartment type is selected. Years are kept as
  // strings in the form ('' = not given) and sent as integers (0 = unknown).
  project_name: '', tenure: '', tenure_detail: '', floor_level: '',
  top_year: '', lease_start_year: ''
};

// Backend's canonical options (main.py TENURE_OPTIONS / FLOOR_LEVEL_OPTIONS).
const TENURE_OPTIONS = ['Freehold', '99-year leasehold', '999-year leasehold', 'Other'];
const FLOOR_LEVEL_OPTIONS = ['Low', 'Mid', 'High'];
const STRATA_TEXT_FIELDS = ['project_name', 'tenure', 'tenure_detail', 'floor_level'];

// '' / junk / out-of-range -> 0 (the backend's "unknown"); never sends a
// string to an int field (that would fail the whole save with a 422).
function toYear(v) {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : 0;
}

// The condo-family part of the save payload. Always sends ALL six keys: the
// backend replaces them wholesale on edit, so an untouched key would be
// cleared, and a cleared one must really clear.
//   - No condo type selected: all blank (a landed listing never stores them).
//   - Condo type(s) only: the land/plot/storeys/site-coverage fields do not
//     apply to a strata unit, so they go as 0 (the backend also drops them).
//   - Mixed landed + condo: both sets are sent as entered.
function strataPayload(form, types) {
  const hasCondo = types.some(isCondoFamilyType);
  const blank = { project_name: '', tenure: '', tenure_detail: '', floor_level: '', top_year: 0, lease_start_year: 0 };
  if (!hasCondo) return blank;
  const tenure = TENURE_OPTIONS.includes(form.tenure) ? form.tenure : '';
  const leasehold = tenure !== '' && tenure !== 'Freehold';
  const out = {
    project_name: String(form.project_name || '').trim().slice(0, 120),
    tenure,
    tenure_detail: tenure === 'Other' ? String(form.tenure_detail || '').trim().slice(0, 80) : '',
    floor_level: FLOOR_LEVEL_OPTIONS.includes(form.floor_level) ? form.floor_level : '',
    top_year: toYear(form.top_year),
    lease_start_year: leasehold ? toYear(form.lease_start_year) : 0
  };
  if (isCondoOnly({ property_types: types })) {
    Object.assign(out, { land_size: 0, plot_width: 0, plot_depth: 0, storeys: 0, site_coverage: 0 });
  }
  return out;
}

// FastAPI sends `detail` as a string for our own errors but as a list of
// objects for a validation failure -- never show "[object Object]".
function readApiError(data, fallback) {
  const d = data && data.detail;
  if (typeof d === 'string' && d.trim()) return d;
  if (Array.isArray(d) && d.length) {
    const msgs = d.map(x => (x && x.msg) ? String(x.msg) : '').filter(Boolean);
    if (msgs.length) return `${fallback}: ${msgs.join('; ')}`;
  }
  return fallback;
}

export default function NewListing({ agent, token, editingListing, onDoneEditing }) {
  const isEditing = !!editingListing;
  const isConvertingSeller = isEditing && editingListing.status === 'lead';
  const [form, setForm] = useState(() => {
    if (editingListing) {
      // Hydrate the multi-select from the full list the backend now serves.
      // CRITICAL (flagged Sev2 data-loss): a multi-type listing must come back
      // with ALL its types so saving doesn't collapse it to one. Fall back to
      // the single property_type for older single-type listings that predate
      // the property_types column (so they keep behaving exactly as before).
      const editTypes = Array.isArray(editingListing.property_types) && editingListing.property_types.filter(Boolean).length
        ? editingListing.property_types.filter(Boolean)
        : (editingListing.property_type ? [editingListing.property_type] : []);
      return {
        property_types: editTypes,
        property_type: editTypes[0] || editingListing.property_type || DEFAULT_FORM.property_type,
        location: editingListing.location || '',
        district: editingListing.district ? String(editingListing.district) : '',
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
        sg_citizen: true,
        code: editingListing.code || '',
        project_name: editingListing.project_name || '',
        tenure: editingListing.tenure || '',
        tenure_detail: editingListing.tenure_detail || '',
        floor_level: editingListing.floor_level || '',
        top_year: editingListing.top_year ? String(editingListing.top_year) : '',
        lease_start_year: editingListing.lease_start_year ? String(editingListing.lease_start_year) : ''
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_FORM;
      const parsed = JSON.parse(saved);
      // Back-compat: forms saved before multi-type held only property_type.
      if (!Array.isArray(parsed.property_types)) {
        parsed.property_types = parsed.property_type ? [parsed.property_type] : [];
      } else {
        parsed.property_types = parsed.property_types.filter(Boolean);
      }
      parsed.property_type = parsed.property_types[0] || '';
      // Forms saved before a field existed (e.g. the condo fields) get its
      // default, so every input stays a controlled '' rather than undefined.
      return { ...DEFAULT_FORM, ...parsed };
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
  // Smart Fill screenshots accumulate (up to MAX_SCREENSHOTS) across several
  // selections; each entry is { id, file, preview } so one can be removed.
  const [screenshots, setScreenshots] = useState([]);
  const [screenshotNotice, setScreenshotNotice] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');
  const [abortController, setAbortController] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoLoadingLabel, setPhotoLoadingLabel] = useState('Uploading photos...');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState([]);
  const [showReplacePhotos, setShowReplacePhotos] = useState(false);
  const [propertyTypeInvalid, setPropertyTypeInvalid] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [contentSaving, setContentSaving] = useState(false);
  const [contentSaveError, setContentSaveError] = useState('');
  const [contentSaveSuccess, setContentSaveSuccess] = useState('');
  const [photoStageLoading, setPhotoStageLoading] = useState(false);
  const [photoStageLoadingLabel, setPhotoStageLoadingLabel] = useState('Uploading photos...');
  const [photoStageSuccess, setPhotoStageSuccess] = useState('');
  const [photoStageError, setPhotoStageError] = useState('');
  const [stagedPhotoUrls, setStagedPhotoUrls] = useState([]);
  // Per-listing writing style override -- '' means "use my profile tone"
  // (the default already set on My Profile), so we only ever send
  // writing_style to the backend when the agent picked something other
  // than the default for this one listing.
  const [writingStyle, setWritingStyle] = useState('');
  // Smart Fill sometimes guesses the wrong district (confirmed case: filled
  // "District 10" for a Tembeling Road property, which is District 15, when
  // the screenshots never even showed a district) -- these track whether the
  // current district value came from Smart Fill and hasn't been looked at
  // yet, so a wrong guess can never silently ride into the write-up.
  const [districtAutofilled, setDistrictAutofilled] = useState(false);
  const [districtConfirmed, setDistrictConfirmed] = useState(false);
  const [districtGateOpen, setDistrictGateOpen] = useState(false);
  // Price is optional and gets the same auto-fill safety net as District:
  // Smart Fill's guess must be looked at once before it can flow into
  // generation, but typing/editing it by hand always counts as confirming.
  const [priceAutofilled, setPriceAutofilled] = useState(false);
  const [priceConfirmed, setPriceConfirmed] = useState(false);
  const [priceGateOpen, setPriceGateOpen] = useState(false);
  // Same safety net, for Bathrooms: the backend now tells us directly (via
  // needs_confirmation) when it isn't confident about the bathroom count,
  // rather than us inferring it from an autofilled value -- bathrooms is
  // also expected to come back blank more often now, and a blank answer
  // still needs a human look before it can flow into generation.
  const [bathroomsAutofilled, setBathroomsAutofilled] = useState(false);
  const [bathroomsConfirmed, setBathroomsConfirmed] = useState(false);
  const [bathroomsGateOpen, setBathroomsGateOpen] = useState(false);
  const fileRef = useRef();
  // Latest form value for merge logic that runs after an await, and the last
  // values Smart Fill itself wrote (so a later pass never overwrites a field
  // the agent has since edited by hand).
  const formRef = useRef(form);
  formRef.current = form;
  const lastAutofillRef = useRef({});
  const screenshotsRef = useRef([]);
  screenshotsRef.current = screenshots;
  const photoRef = useRef();
  const folderRef = useRef();
  const stagePhotoRef = useRef();
  const stageFolderRef = useRef();
  const districtSelectRef = useRef();
  const priceInputRef = useRef();
  const bathroomsInputRef = useRef();

  // Persist form to localStorage whenever it changes (skip while editing an existing listing)
  useEffect(() => {
    if (isEditing) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form, isEditing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Which field groups apply to the selected type(s). Land/plot/storeys/site
  // coverage show unless EVERY selected type is condo family (so a mixed
  // landed + condo listing keeps them, and so does "nothing picked yet").
  // Condo fields show as soon as any condo-family type is picked.
  const selectedTypes = Array.isArray(form.property_types) ? form.property_types.filter(Boolean) : [];
  const hasCondoType = selectedTypes.some(isCondoFamilyType);
  const showLandFields = !isCondoOnly({ property_types: selectedTypes });
  // sg_citizen defaults to true - GCB/landed purchases are Singapore Citizens only

  // Toggle a property type in/out of the multi-select, always keeping
  // property_type (the PRIMARY) pointed at the first still-selected type.
  // Preserves selection order so "first picked" stays the primary.
  const toggleType = (t) => {
    setForm(f => {
      const current = Array.isArray(f.property_types) ? f.property_types : [];
      const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
      return { ...f, property_types: next, property_type: next[0] || '' };
    });
    setPropertyTypeInvalid(false);
  };

  const clearForm = () => {
    setForm(DEFAULT_FORM);
    localStorage.removeItem(STORAGE_KEY);
    setDeclaration(false);
    setResult(null);
    setError('');
    setPhotoSuccess('');
    setPhotoError('');
    setUploadedPhotoUrls([]);
    setShowReplacePhotos(false);
    screenshotsRef.current.forEach(s => { try { URL.revokeObjectURL(s.preview); } catch {} });
    setScreenshots([]);
    setScreenshotNotice('');
    lastAutofillRef.current = {};
    setImageSuccess('');
    setStagedPhotoUrls([]);
    setPhotoStageSuccess('');
    setPhotoStageError('');
    setDistrictAutofilled(false);
    setDistrictConfirmed(false);
    setDistrictGateOpen(false);
    setPriceAutofilled(false);
    setPriceConfirmed(false);
    setPriceGateOpen(false);
    setBathroomsAutofilled(false);
    setBathroomsConfirmed(false);
    setBathroomsGateOpen(false);
    setWritingStyle('');
    if (fileRef.current) fileRef.current.value = '';
    if (photoRef.current) photoRef.current.value = '';
    if (stagePhotoRef.current) stagePhotoRef.current.value = '';
    if (stageFolderRef.current) stageFolderRef.current.value = '';
  };

  // Uploads the listing's property photos before the listing exists, so
  // their URLs can ride along in /api/listings/generate and the write-up
  // gets generated from photos + fields together. Downscaled client-side
  // the same way Step 3's per-listing upload does (max 1920px JPEG) to keep
  // the request comfortably under the production edge proxy's body limit --
  // that limit is what silently broke photo uploads before (see the batching
  // comment further down). This call is intentionally a single POST rather
  // than batched: the staging endpoint's contract isn't confirmed yet, and
  // guessing at multi-call append semantics risks silently dropping photos
  // if a later batch overwrites an earlier one instead of appending.
  const handleStagePhotos = async (e) => {
    const allFiles = Array.from(e.target.files);
    const files = allFiles
      .filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'))
      .slice(0, 15);
    if (!files.length) return;
    setPhotoStageLoading(true);
    setPhotoStageSuccess('');
    setPhotoStageError('');
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

      const downscaleOrRead = (file) => new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          try {
            const maxDim = 1920;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ image_data: dataUrl.split(',')[1], media_type: 'image/jpeg' });
          } catch {
            readFile(file).then(resolve, () => resolve(null));
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          readFile(file).then(resolve, () => resolve(null));
        };
        img.src = objectUrl;
      });

      const pdfFiles = files.filter(f => f.type === 'application/pdf');
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      const imageResults = (await Promise.all(imageFiles.map(downscaleOrRead))).filter(Boolean);

      let pdfExtractedImages = [];
      if (pdfFiles.length > 0) {
        setPhotoStageLoadingLabel(pdfFiles.length > 1 ? 'Extracting photos from PDFs...' : 'Extracting photos from PDF...');
        const pdfReads = await Promise.all(pdfFiles.map(readFile));
        const perPdfResults = await Promise.all(pdfReads.map(async ({ image_data }) => {
          const res = await fetch(`${API}/api/listings/extract-pdf-photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ pdf_data: image_data })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Failed to extract photos from PDF');
          return data;
        }));
        pdfExtractedImages = perPdfResults.flatMap(r => r.images || []);
        setPhotoStageLoadingLabel('Uploading photos...');
      }

      const images = [...imageResults, ...pdfExtractedImages].slice(0, 15);
      if (!images.length) throw new Error('No photos found to upload.');

      // The staging endpoint is stateless by design (no upload_session/
      // finalize bookkeeping) -- send a few images per POST and concatenate
      // the photo_urls each chunk returns, in order. Chunking keeps every
      // request comfortably under the production edge proxy's ~10MB body
      // limit, which is what silently broke photo uploads before.
      const CHUNK_SIZE = 4;
      let committedUrls = [];
      for (let start = 0; start < images.length; start += CHUNK_SIZE) {
        const chunk = images.slice(start, start + CHUNK_SIZE);
        setPhotoStageLoadingLabel(`Uploading photos ${Math.min(start + chunk.length, images.length)} of ${images.length}...`);
        const response = await fetch(`${API}${STAGE_PHOTOS_PATH}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ images: chunk })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to upload photos');
        committedUrls = committedUrls.concat(data.photo_urls || []);
      }
      setStagedPhotoUrls(committedUrls);
      const stagedCount = committedUrls.length;
      const pdfNote = pdfExtractedImages.length > 0 ? ` (${pdfExtractedImages.length} extracted from PDF)` : '';
      setPhotoStageSuccess(`${stagedCount} photo${stagedCount === 1 ? '' : 's'} ready for your listing!${pdfNote}`);
    } catch (err) {
      setPhotoStageError(`Failed to upload photos: ${err.message}`);
    } finally {
      setPhotoStageLoading(false);
      setPhotoStageLoadingLabel('Uploading photos...');
    }
  };

  const removeStagedPhoto = (indexToRemove) => {
    setStagedPhotoUrls(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const MAX_SCREENSHOTS = 5;

  // Release preview URLs when leaving the page.
  useEffect(() => () => {
    screenshotsRef.current.forEach(s => { try { URL.revokeObjectURL(s.preview); } catch {} });
  }, []);

  const isBlankValue = (v) =>
    v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

  // Reads the screenshots as base64. Big phone screenshots (several MB each)
  // are re-encoded smaller so five of them can't blow past the production
  // proxy's request-size limit; small ones go through untouched, and any
  // decode problem falls back to the original bytes.
  const readScreenshot = (file) => new Promise((resolve, reject) => {
    const rawRead = () => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve({
        image_data: ev.target.result.split(',')[1],
        media_type: file.type
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };
    if (file.size <= 1500000) { rawRead(); return; }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const maxDim = 2400;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({ image_data: dataUrl.split(',')[1], media_type: 'image/jpeg' });
      } catch {
        rawRead();
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); rawRead(); };
    img.src = objectUrl;
  });

  // Runs Smart Fill extraction over the FULL set of screenshots passed in.
  const runSmartFill = async (items) => {
    if (!items.length) return;
    setImageLoading(true);
    setImageSuccess('');
    setError('');
    const controller = new AbortController();
    setAbortController(controller);
    const timeout = setTimeout(() => {
      controller.abort();
      setImageLoading(false);
      setError('Image reading timed out. Your screenshots are still here - tap "Read screenshots again", or fill in the form manually.');
    }, 60000);
    try {
      const images = await Promise.all(items.map(it => readScreenshot(it.file)));
      const response = await fetch(`${API}/api/extract-listing-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const extracted = await response.json();
      if (!response.ok) throw new Error(extracted.detail || 'Failed to read image');

      // Never let a blank from this pass wipe a good value from an earlier
      // screenshot or from the agent's own typing.
      Object.keys(extracted).forEach(k => { if (isBlankValue(extracted[k])) delete extracted[k]; });

      if (extracted.price) {
        extracted.price = fullNumberToMillions(extracted.price);
      }
      if (extracted.district !== undefined) {
        extracted.district = String(extracted.district);
      }
      // Bathrooms works differently from District/Price: the backend tells us
      // directly (needs_confirmation) when it isn't confident, rather than us
      // treating "a value came back" as the signal -- a guess AND a blank both
      // need a look. Strip the flag out of `extracted` before merging so it
      // never rides along into the /generate payload.
      const needsConfirmation = Array.isArray(extracted.needs_confirmation) ? extracted.needs_confirmation : [];
      delete extracted.needs_confirmation;

      // Merge onto the current form. A field the agent edited by hand since
      // Smart Fill last wrote it is left alone.
      const current = formRef.current;
      const last = lastAutofillRef.current;
      const applied = {};
      Object.keys(extracted).forEach(k => {
        if (k === 'property_type' || k === 'property_types') return;
        const hadAutofill = Object.prototype.hasOwnProperty.call(last, k);
        const editedByHand = hadAutofill && String(current[k] ?? '') !== String(last[k] ?? '');
        if (!editedByHand) applied[k] = extracted[k];
      });
      lastAutofillRef.current = { ...last, ...applied };

      // Confirmation gates only re-arm for values Smart Fill actually wrote
      // (district/price guesses must be looked at once).
      if (applied.price) {
        setPriceAutofilled(true);
        setPriceConfirmed(false);
        setPriceGateOpen(false);
      }
      if (applied.district) {
        setDistrictAutofilled(true);
        setDistrictConfirmed(false);
        setDistrictGateOpen(false);
      }
      if (needsConfirmation.includes('bathrooms')) {
        setBathroomsAutofilled(true);
        setBathroomsConfirmed(false);
        setBathroomsGateOpen(false);
      }

      setForm(f => {
        const merged = { ...f, ...applied };
        // Smart Fill returns a single property_type (or, defensively, a list).
        // Fold whatever came back into the multi-select so the chips reflect
        // it, and keep property_type synced to the primary. Only overwrite the
        // current selection when Smart Fill actually detected a type -- a blank
        // result leaves the agent's existing picks untouched.
        const fCurrent = Array.isArray(f.property_types) ? f.property_types : [];
        if (Array.isArray(extracted.property_types) && extracted.property_types.filter(Boolean).length) {
          merged.property_types = extracted.property_types.filter(Boolean);
        } else if (extracted.property_type) {
          merged.property_types = [extracted.property_type];
        } else {
          merged.property_types = fCurrent;
        }
        merged.property_type = merged.property_types[0] || '';
        return merged;
      });
      const n = items.length;
      setImageSuccess(`Details extracted from ${n} image${n > 1 ? 's' : ''}! Please review and adjust if needed.`);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name !== 'AbortError') {
        setError('Could not read your screenshots. They are still here - tap "Read screenshots again", or fill in the form manually.');
      }
    } finally {
      setImageLoading(false);
      setAbortController(null);
    }
  };

  // Adds to (never replaces) the screenshots already chosen, then re-reads the
  // whole set so the form reflects every screenshot.
  const handleImageUpload = (e) => {
    const picked = Array.from(e.target.files || []).filter(f => f.type && f.type.startsWith('image/'));
    const hadFiles = (e.target.files || []).length > 0;
    e.target.value = ''; // so picking the same file again still fires onChange
    setScreenshotNotice('');
    if (!picked.length) {
      if (hadFiles) setScreenshotNotice('Those files are not images - please choose screenshots (PNG or JPG).');
      return;
    }
    const keyOf = (f) => `${f.name}|${f.size}|${f.lastModified}`;
    const seen = new Set(screenshots.map(s => keyOf(s.file)));
    const fresh = [];
    let dupes = 0;
    picked.forEach(f => {
      const k = keyOf(f);
      if (seen.has(k)) { dupes += 1; return; }
      seen.add(k);
      fresh.push(f);
    });
    const room = Math.max(0, MAX_SCREENSHOTS - screenshots.length);
    const toAdd = fresh.slice(0, room);
    const overflow = fresh.length - toAdd.length;
    const notes = [];
    if (overflow > 0) notes.push(`You can use up to ${MAX_SCREENSHOTS} screenshots - ${overflow} extra ${overflow === 1 ? 'one was' : 'were'} not added. Remove one with the x if you want to swap it.`);
    if (dupes > 0) notes.push(`${dupes} duplicate ${dupes === 1 ? 'screenshot was' : 'screenshots were'} skipped.`);
    if (notes.length) setScreenshotNotice(notes.join(' '));
    if (!toAdd.length) return;
    const next = [
      ...screenshots,
      ...toAdd.map(file => ({
        id: `${keyOf(file)}|${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file)
      }))
    ];
    setScreenshots(next);
    runSmartFill(next);
  };

  const removeScreenshot = (id) => {
    if (imageLoading) return;
    const target = screenshots.find(s => s.id === id);
    if (!target) return;
    try { URL.revokeObjectURL(target.preview); } catch {}
    const next = screenshots.filter(s => s.id !== id);
    setScreenshots(next);
    setError('');
    if (!next.length) {
      setImageSuccess('');
      setScreenshotNotice('');
      return;
    }
    setScreenshotNotice('Screenshot removed. Anything it already filled in is left as it was - please review the form.');
    runSmartFill(next);
  };

  const cancelImageUpload = () => {
    if (abortController) {
      abortController.abort();
      setImageLoading(false);
      setAbortController(null);
      setError('Image reading cancelled.');
    }
  };

  // Full reset of the Smart Fill box (the form fields stay as they are).
  const clearImages = () => {
    screenshots.forEach(s => { try { URL.revokeObjectURL(s.preview); } catch {} });
    setScreenshots([]);
    setScreenshotNotice('');
    setImageSuccess('');
    setError('');
    lastAutofillRef.current = {};
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePhotoUpload = async (e) => {
    // Folder selections (webkitdirectory) commonly include junk that isn't a
    // photo or a PDF -- .DS_Store, thumbs.db, nested non-image files -- so only
    // keep files we can actually do something with, rather than assuming
    // "not a PDF" means "is an image".
    const allFiles = Array.from(e.target.files);
    const files = allFiles
      .filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'))
      .slice(0, 15);
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

      // Downscale in the browser before uploading. The backend re-compresses
      // every photo to max 1920px JPEG anyway, so sending an 8MB straight-off-
      // the-camera original is pure wasted payload -- and worse than wasted:
      // the production edge proxy kills request bodies over ~10MB mid-stream,
      // which the browser reports as the unhelpful 'Failed to fetch' (this is
      // exactly what broke Janel's photo upload). Resizing client-side to the
      // same 1920px spec cuts each photo to a few hundred KB with zero
      // difference in what actually gets stored. Falls back to the raw file
      // bytes if the browser can't decode the format (e.g. HEIC on Chrome) --
      // the backend can often still handle those.
      const downscaleOrRead = (file) => new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          try {
            const maxDim = 1920;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ image_data: dataUrl.split(',')[1], media_type: 'image/jpeg' });
          } catch {
            readFile(file).then(resolve, () => resolve(null));
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          readFile(file).then(resolve, () => resolve(null));
        };
        img.src = objectUrl;
      });

      const pdfFiles = files.filter(f => f.type === 'application/pdf');
      const imageFiles = files.filter(f => f.type.startsWith('image/'));

      const imageResults = (await Promise.all(imageFiles.map(downscaleOrRead))).filter(Boolean);

      let pdfExtractedImages = [];
      let pdfSkippedGraphics = 0;
      let pdfSkippedDuplicates = 0;
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
          return data;
        }));
        pdfExtractedImages = perPdfResults.flatMap(r => r.images || []);
        pdfSkippedGraphics = perPdfResults.reduce((sum, r) => sum + (r.skipped_graphics || 0), 0);
        pdfSkippedDuplicates = perPdfResults.reduce((sum, r) => sum + (r.skipped_duplicates || 0), 0);
        setPhotoLoadingLabel('Uploading photos...');
      }

      const images = [...imageResults, ...pdfExtractedImages].slice(0, 15);
      if (!images.length) throw new Error('No photos found to upload.');

      // Upload in small batches, sequentially, instead of one request carrying
      // every photo -- a single request with 15 photos can still brush the
      // proxy's ~10MB body ceiling even after downscaling. Batches now stage
      // under a shared upload_session and only the last (finalize: true) batch
      // actually commits them to the listing -- so a batch that fails partway,
      // or a retry, can no longer wipe or duplicate photos the way separate
      // per-batch commits could. append stays false throughout: this whole
      // selection becomes the listing's complete photo set once it commits,
      // same end result as before.
      const BATCH_SIZE = 4;
      const uploadSession = genUploadSession();
      let finalData = null;
      let batchIndex = 0;
      for (let start = 0; start < images.length; start += BATCH_SIZE) {
        const batch = images.slice(start, start + BATCH_SIZE);
        const isLastBatch = start + BATCH_SIZE >= images.length;
        setPhotoLoadingLabel(`Uploading photos ${Math.min(start + batch.length, images.length)} of ${images.length}...`);
        const response = await fetch(`${API}/api/listings/${result.listing.id}/upload-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            images: batch,
            append: false,
            upload_session: uploadSession,
            batch_index: batchIndex,
            finalize: isLastBatch
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to upload photos');
        finalData = data;
        batchIndex++;
      }
      // Report what the server actually committed, not how many files the
      // agent picked -- a capped session lands fewer photos than were selected.
      const committedUrls = finalData?.image_urls || [];
      setUploadedPhotoUrls(committedUrls);
      const stagedCount = committedUrls.length;
      const pdfNote = pdfExtractedImages.length > 0 ? ` (${pdfExtractedImages.length} extracted from PDF)` : '';
      const cappedNote = finalData?.capped ? ' Some photos were skipped because listings are capped at 15 photos.' : '';
      const skipNotes = [];
      if (pdfSkippedGraphics > 0) skipNotes.push(`${pdfSkippedGraphics} brochure graphic${pdfSkippedGraphics > 1 ? 's were' : ' was'} filtered out`);
      if (pdfSkippedDuplicates > 0) skipNotes.push(`${pdfSkippedDuplicates} duplicate photo${pdfSkippedDuplicates > 1 ? 's were' : ' was'} skipped`);
      const skipNote = skipNotes.length ? ` (${skipNotes.join('; ')})` : '';
      setPhotoSuccess(`${stagedCount} photo${stagedCount === 1 ? '' : 's'} uploaded successfully!${pdfNote}${skipNote}${cappedNote}`);
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

  const startEditContent = () => {
    setEditedContent(result.listing.content || '');
    setContentSaveError('');
    setContentSaveSuccess('');
    setEditingContent(true);
  };

  const cancelEditContent = () => {
    setEditingContent(false);
    setContentSaveError('');
  };

  const saveEditContent = async () => {
    setContentSaving(true);
    setContentSaveError('');
    try {
      const res = await fetch(`${API}/api/listings/${result.listing.id}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editedContent })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save write-up');
      setResult(r => ({ ...r, listing: { ...r.listing, content: data.content } }));
      setEditingContent(false);
      setContentSaveSuccess('Write-up updated!');
      setTimeout(() => setContentSaveSuccess(''), 3000);
    } catch (err) {
      setContentSaveError(err.message);
    } finally {
      setContentSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.property_types || form.property_types.length === 0) {
      setPropertyTypeInvalid(true);
      setError('Please select at least one property type before continuing.');
      return;
    }
    if (!declaration) { setError('Please tick the declaration box.'); return; }
    // Gently stop rather than silently sending a possibly-wrong Smart Fill
    // guess (district or price) into the write-up. Only ever fires for the
    // auto-filled, not-yet-looked-at case -- fields the agent picked/typed
    // themselves need zero friction. Both checked together (not an early
    // return per field) so if both are pending the agent sees both at once
    // instead of clearing one, clicking Generate again, then hitting the other.
    const districtNeedsConfirm = !isEditing && districtAutofilled && !districtConfirmed;
    const priceNeedsConfirm = !isEditing && priceAutofilled && !priceConfirmed;
    const bathroomsNeedsConfirm = !isEditing && bathroomsAutofilled && !bathroomsConfirmed;
    if (districtNeedsConfirm || priceNeedsConfirm || bathroomsNeedsConfirm) {
      setPropertyTypeInvalid(false);
      setError('');
      setDistrictGateOpen(districtNeedsConfirm);
      setPriceGateOpen(priceNeedsConfirm);
      setBathroomsGateOpen(bathroomsNeedsConfirm);
      return;
    }
    setPropertyTypeInvalid(false);
    setDistrictGateOpen(false);
    setPriceGateOpen(false);
    setBathroomsGateOpen(false);
    doSubmit();
  };

  // Each gate's own "quick nod" resolution -- confirms that one field and,
  // if the other gate isn't also still open, continues straight into the
  // generation that was already requested (so confirming never costs a
  // second trip through the Generate button when only one field was
  // pending). If the other field is still unconfirmed, its box stays open
  // instead of submitting early.
  const confirmDistrictAndMaybeGenerate = () => {
    setDistrictConfirmed(true);
    setDistrictGateOpen(false);
    if (priceAutofilled && !priceConfirmed) { setPriceGateOpen(true); return; }
    if (bathroomsAutofilled && !bathroomsConfirmed) { setBathroomsGateOpen(true); return; }
    doSubmit();
  };

  const confirmPriceAndMaybeGenerate = () => {
    setPriceConfirmed(true);
    setPriceGateOpen(false);
    if (districtAutofilled && !districtConfirmed) { setDistrictGateOpen(true); return; }
    if (bathroomsAutofilled && !bathroomsConfirmed) { setBathroomsGateOpen(true); return; }
    doSubmit();
  };

  const confirmBathroomsAndMaybeGenerate = () => {
    setBathroomsConfirmed(true);
    setBathroomsGateOpen(false);
    if (districtAutofilled && !districtConfirmed) { setDistrictGateOpen(true); return; }
    if (priceAutofilled && !priceConfirmed) { setPriceGateOpen(true); return; }
    doSubmit();
  };

  const jumpToDistrictField = () => {
    setDistrictGateOpen(false);
    if (districtSelectRef.current) {
      districtSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      districtSelectRef.current.focus();
    }
  };

  const jumpToPriceField = () => {
    setPriceGateOpen(false);
    if (priceInputRef.current) {
      priceInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      priceInputRef.current.focus();
    }
  };

  const jumpToBathroomsField = () => {
    setBathroomsGateOpen(false);
    if (bathroomsInputRef.current) {
      bathroomsInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bathroomsInputRef.current.focus();
    }
  };

  const doSubmit = async () => {
    setError(''); setLoading(true); setResult(null); setSaveSuccess('');
    // Send the full list as property_types[] (backend accepts it) and keep
    // property_type = the PRIMARY (first selected) for backward compatibility
    // and the compliance check. Belt-and-braces: re-derive the primary here so
    // it can never drift from the list, even after a localStorage restore.
    const cleanTypes = (Array.isArray(form.property_types) ? form.property_types : []).filter(Boolean);
    const payload = {
      ...form,
      property_types: cleanTypes,
      property_type: cleanTypes[0] || form.property_type || '',
      price: millionsToFullNumber(form.price),
      ...strataPayload(form, cleanTypes)
    };
    // What the agent actually gave us in the condo fields, so we can tell
    // them plainly if the server could not keep it.
    const strataSent = STRATA_TEXT_FIELDS.some(k => payload[k]) || payload.top_year > 0 || payload.lease_start_year > 0;
    try {
      if (isEditing) {
        const res = await fetch(`${API}/api/listings/${editingListing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(readApiError(data, 'Error saving listing'));
        // The saved row echoes the condo fields back. If we sent some and none
        // came back, the server could not store them (its one-time database
        // update has not run yet) -- say so instead of a silent loss.
        const strataKept = data && (STRATA_TEXT_FIELDS.some(k => data[k]) || data.top_year > 0 || data.lease_start_year > 0);
        if (strataSent && (data.attributes_saved === false || !strataKept)) {
          setSaveSuccess('Listing updated. Note: the condo details (project name, tenure, floor level, years) could not be stored yet - everything else is saved. Please re-enter them later.');
          setTimeout(() => onDoneEditing && onDoneEditing(), 5000);
          return;
        }
        setSaveSuccess('Listing updated!');
        setTimeout(() => onDoneEditing && onDoneEditing(), 900);
        return;
      }
      const res = await fetch(`${API}/api/listings/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // writing_style is per-listing and optional -- only sent when the
        // agent picked something other than "use my profile tone" for this
        // one listing; leaving it out lets the backend fall back to their
        // profile's own tone, same as before this picker existed.
        body: JSON.stringify({ ...payload, photo_urls: stagedPhotoUrls, ...(writingStyle ? { writing_style: writingStyle } : {}) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(readApiError(data, 'Error generating listing'));
      // Condo fields are stored only once the server's database update has
      // run (attributes_saved). They were still used for this write-up; the
      // agent just needs to know they will not be on the saved listing.
      if (data && data.listing && strataSent && data.listing.attributes_saved !== true && data.compliance) {
        const note = 'The condo details (project name, tenure, floor level, years) were used for this write-up but could not be saved on the listing yet. You can add them later with Edit.';
        data.compliance = { ...data.compliance, warnings: [...(data.compliance.warnings || []), note] };
      }
      setResult(data);
      // Backend attaches the staged photos to the new listing during
      // /generate and hands them back on data.listing.images -- show those
      // immediately on the result screen so the agent sees their photos are
      // already on the listing, instead of an empty-looking upload box.
      setUploadedPhotoUrls(data.listing?.images || []);
      setShowReplacePhotos(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            onClick={() => fileRef.current.click()} disabled={imageLoading || screenshots.length >= MAX_SCREENSHOTS}
          >
            {imageLoading ? <><span className="spinner" />Reading images...</> : (screenshots.length === 0 ? 'Upload Property Screenshots (up to 5)' : (screenshots.length >= MAX_SCREENSHOTS ? 'Maximum 5 screenshots reached' : 'Add more screenshots'))}
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
        {screenshots.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {screenshots.map((s, i) => (
              <div key={s.id} style={{ position: 'relative' }}>
                <img src={s.preview} alt={`Uploaded ${i + 1}`}
                  style={{ display: 'block', maxWidth: '150px', maxHeight: '120px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }} />
                <button
                  type="button" onClick={() => removeScreenshot(s.id)} disabled={imageLoading}
                  aria-label={`Remove screenshot ${i + 1}`} title="Remove this screenshot"
                  style={{
                    position: 'absolute', top: '-6px', right: '-6px', width: '22px', height: '22px',
                    borderRadius: '50%', border: '1px solid rgba(212,175,55,0.6)',
                    background: '#1a1a1a', color: '#F0C84A', fontSize: '12px', lineHeight: '20px',
                    padding: 0, cursor: imageLoading ? 'not-allowed' : 'pointer',
                    opacity: imageLoading ? 0.5 : 1
                  }}
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        )}
        {screenshots.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(248,244,236,0.6)' }}>
            {screenshots.length} of {MAX_SCREENSHOTS} screenshots
            {screenshots.length < MAX_SCREENSHOTS ? ' - add more any time and the details update from all of them.' : ' - the maximum.'}
          </div>
        )}
        {screenshotNotice && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#F0C84A' }}>{screenshotNotice}</div>
        )}
        {imageSuccess && <div className="success-msg" style={{ marginTop: '12px' }}>{imageSuccess}</div>}
        {!imageLoading && !imageSuccess && screenshots.length > 0 && (
          <button
            type="button" onClick={() => runSmartFill(screenshots)}
            style={{
              marginTop: '8px', marginRight: '8px', background: 'transparent',
              border: '1px solid rgba(212,175,55,0.5)', color: '#F0C84A',
              padding: '6px 14px', borderRadius: '3px', cursor: 'pointer',
              fontSize: '12px', fontFamily: "'Montserrat', sans-serif"
            }}
          >
            Read screenshots again
          </button>
        )}
        {screenshots.length > 0 && !imageLoading && (
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
              <label className="form-label">Property Type</label>
              <div
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: '8px',
                  padding: '10px 12px', borderRadius: '3px',
                  background: 'rgba(0,0,0,0.15)',
                  border: `1px solid ${propertyTypeInvalid || (imageSuccess && form.property_types.length === 0) ? '#e05252' : 'rgba(212,175,55,0.3)'}`
                }}
              >
                {[
                  { label: 'Landed', types: PRESTIGE_TYPES },
                  { label: 'Condo / Apartment', types: CONDO_FAMILY_TYPES }
                ].map(group => (
                  <div key={group.label} style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.4)', minWidth: '120px' }}>{group.label}</span>
                    {group.types.map(t => {
                      const active = form.property_types.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleType(t)}
                          style={{
                            background: active ? 'rgba(212,175,55,0.25)' : 'transparent',
                            border: `1px solid ${active ? '#D4AF37' : 'rgba(212,175,55,0.3)'}`,
                            color: active ? '#F0C84A' : 'rgba(248,244,236,0.6)',
                            padding: '6px 14px', borderRadius: '3px', cursor: 'pointer',
                            fontSize: '12px', fontFamily: "'Montserrat', sans-serif"
                          }}
                        >
                          {active ? '✓ ' : ''}{t}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
                Pick one or more. {form.property_types.length > 1
                  ? <>Your main type is <strong style={{ color: 'rgba(240,200,74,0.85)' }}>{form.property_types[0]}</strong> (the first one you selected).</>
                  : 'If a property fits more than one type, select all that apply — the first you pick is the main type.'}
              </div>
              {imageSuccess && form.property_types.length === 0 && (
                <div className="error-msg" style={{ marginTop: '6px' }}>
                  Your screenshots didn't state a property type — please select the correct one yourself before continuing.
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Nassim Road, District 10" required />
            </div>
            <div className="form-group">
              <label className="form-label">District (optional)</label>
              <select
                ref={districtSelectRef}
                className="form-select"
                value={form.district}
                onChange={e => {
                  set('district', e.target.value);
                  // Picking a value by hand -- whether different from the
                  // autofill or back to it -- is the agent looking at it and
                  // deciding, so it always counts as confirmed.
                  setDistrictConfirmed(true);
                  setDistrictGateOpen(false);
                }}
              >
                <option value="">-- Select District (optional) --</option>
                {SG_DISTRICTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              {districtAutofilled && !districtConfirmed ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
                  fontSize: '12px', color: 'rgba(248,244,236,0.85)', marginTop: '8px',
                  background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)',
                  borderRadius: '3px', padding: '8px 12px'
                }}>
                  <span>⚠️ Auto-filled from your screenshots — please confirm this is correct.</span>
                  <button
                    type="button"
                    onClick={() => { setDistrictConfirmed(true); setDistrictGateOpen(false); }}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,165,0,0.5)', color: '#F0C84A',
                      padding: '3px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px',
                      fontFamily: "'Montserrat', sans-serif", whiteSpace: 'nowrap'
                    }}
                  >
                    ✓ Correct
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
                  Used in your write-up. Smart Fill will pre-select this if your screenshots state it — otherwise pick it yourself.
                </div>
              )}
            </div>
            {showLandFields && (
              <>
                <div className="form-group">
                  <label className="form-label">Land Size (sqft)</label>
                  <input className="form-input" type="number" value={form.land_size} onChange={e => set('land_size', +e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Plot Width / Frontage</label>
                  <input className="form-input" type="number" step="0.1" value={form.plot_width} onChange={e => set('plot_width', +e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Plot Depth (metres)</label>
                  <input className="form-input" type="number" step="0.1" value={form.plot_depth} onChange={e => set('plot_depth', +e.target.value)} />
                </div>
              </>
            )}
            {hasCondoType && (
              <>
                <div className="form-group">
                  <label className="form-label">Project Name (optional, private)</label>
                  <input
                    className="form-input"
                    value={form.project_name || ''}
                    maxLength={120}
                    onChange={e => set('project_name', e.target.value)}
                    placeholder="e.g. the development's name - no unit number"
                  />
                  <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
                    For your own records and Pricing Reports only. It is never shown in captions, the write-up or your buyer page - buyers see the district.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tenure (optional)</label>
                  <select className="form-select" value={form.tenure || ''} onChange={e => set('tenure', e.target.value)}>
                    <option value="">-- Not stated --</option>
                    {TENURE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.tenure === 'Other' && (
                    <input
                      className="form-input"
                      style={{ marginTop: '8px' }}
                      value={form.tenure_detail || ''}
                      maxLength={80}
                      onChange={e => set('tenure_detail', e.target.value)}
                      placeholder="e.g. 103-year leasehold"
                    />
                  )}
                  <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
                    Leave it blank if you are not sure - tenure is only mentioned when you give it.
                  </div>
                </div>
              </>
            )}
          </div>
          <div>
            <div className="form-group">
              <label className="form-label">{showLandFields ? 'Built-up Size (sqft)' : 'Floor Area (sqft)'}</label>
              <input className="form-input" type="number" value={form.built_up} onChange={e => set('built_up', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bedrooms</label>
              <input className="form-input" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} placeholder="e.g. 4" required />
            </div>
            <div className="form-group">
              <label className="form-label">Bathrooms</label>
              <input
                ref={bathroomsInputRef}
                className="form-input"
                value={form.bathrooms}
                onChange={e => {
                  set('bathrooms', e.target.value);
                  // Typing/editing by hand -- even clearing it back to blank
                  // -- is the agent looking at it and deciding, so it always
                  // counts as confirmed, same as Price above.
                  setBathroomsConfirmed(true);
                  setBathroomsGateOpen(false);
                }}
                placeholder="e.g. 4"
              />
              {bathroomsAutofilled && !bathroomsConfirmed && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
                  fontSize: '12px', color: 'rgba(248,244,236,0.85)', marginTop: '8px',
                  background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)',
                  borderRadius: '3px', padding: '8px 12px'
                }}>
                  <span>⚠️ Your screenshots weren't clear on bathrooms — please confirm or fill this in yourself.</span>
                  <button
                    type="button"
                    onClick={() => { setBathroomsConfirmed(true); setBathroomsGateOpen(false); }}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,165,0,0.5)', color: '#F0C84A',
                      padding: '3px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px',
                      fontFamily: "'Montserrat', sans-serif", whiteSpace: 'nowrap'
                    }}
                  >
                    ✓ Correct
                  </button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Asking Price (SGD, in Millions) (optional)</label>
              <input
                ref={priceInputRef}
                className="form-input"
                value={form.price}
                onChange={e => {
                  set('price', e.target.value);
                  // Typing/editing by hand -- even clearing it back to blank
                  // -- is the agent looking at it and deciding, so it always
                  // counts as confirmed.
                  setPriceConfirmed(true);
                  setPriceGateOpen(false);
                }}
                placeholder={hasCondoType && !showLandFields
                  ? 'e.g. 1.65, or 0.88 for $880K (leave blank if not set yet)'
                  : 'e.g. 25.7 (leave blank if not set yet)'}
              />
              {priceAutofilled && !priceConfirmed && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
                  fontSize: '12px', color: 'rgba(248,244,236,0.85)', marginTop: '8px',
                  background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)',
                  borderRadius: '3px', padding: '8px 12px'
                }}>
                  <span>⚠️ Auto-filled from your screenshots — please confirm this price.</span>
                  <button
                    type="button"
                    onClick={() => { setPriceConfirmed(true); setPriceGateOpen(false); }}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,165,0,0.5)', color: '#F0C84A',
                      padding: '3px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px',
                      fontFamily: "'Montserrat', sans-serif", whiteSpace: 'nowrap'
                    }}
                  >
                    ✓ Correct
                  </button>
                </div>
              )}
            </div>
            {showLandFields && (
              <>
                <div className="form-group">
                  <label className="form-label">Number of Storeys</label>
                  <input className="form-input" type="number" value={form.storeys} onChange={e => set('storeys', +e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Site Coverage (%)</label>
                  <input className="form-input" type="number" step="0.1" value={form.site_coverage} onChange={e => set('site_coverage', +e.target.value)} />
                </div>
              </>
            )}
            {hasCondoType && (
              <>
                <div className="form-group">
                  <label className="form-label">Floor Level (optional)</label>
                  <select className="form-select" value={form.floor_level || ''} onChange={e => set('floor_level', e.target.value)}>
                    <option value="">-- Not stated --</option>
                    {FLOOR_LEVEL_OPTIONS.map(f => <option key={f} value={f}>{f} floor</option>)}
                  </select>
                  <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
                    A band only - the exact floor and unit number are never asked for or shown.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">TOP Year (optional)</label>
                  <input
                    className="form-input"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.top_year || ''}
                    onChange={e => set('top_year', e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 2019"
                  />
                </div>
                {form.tenure && form.tenure !== 'Freehold' && (
                  <div className="form-group">
                    <label className="form-label">Lease Start Year (optional)</label>
                    <input
                      className="form-input"
                      inputMode="numeric"
                      maxLength={4}
                      value={form.lease_start_year || ''}
                      onChange={e => set('lease_start_year', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 2015"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Special Features</label>
          <textarea className="form-textarea" value={form.features} onChange={e => set('features', e.target.value)} placeholder="e.g. Private pool, 3-car garage, newly renovated" />
        </div>

        <div className="form-group">
          <label className="form-label">Listing Code (optional)</label>
          <input
            className="form-input"
            value={form.code}
            onChange={e => set('code', e.target.value)}
            placeholder="e.g. NASSIM"
          />
          <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
            The short code in your buyer link (nestlist.sg/&lt;handle&gt;/&lt;code&gt;). Auto-generated from the street — leave blank to auto-generate, or type your own.
          </div>
        </div>

        {!isEditing && (
          <div className="form-group">
            <label className="form-label">Writing Style for This Listing (optional)</label>
            <select
              className="form-select"
              value={writingStyle}
              onChange={e => setWritingStyle(e.target.value)}
            >
              <option value="">Use my profile's default tone</option>
              <option value="Warm & Conversational">Warm & Conversational</option>
              <option value="Formal & Professional">Formal & Professional</option>
              <option value="Bold & Punchy">Bold & Punchy</option>
            </select>
            <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
              Overrides your profile's writing style — for this listing only. Your profile's default tone (My Profile) is unaffected and every other listing keeps using it.
            </div>
          </div>
        )}

        {!isEditing && (
          <div style={{
            background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '4px', padding: '20px 24px', marginBottom: '24px'
          }}>
            <div className="section-label" style={{ marginBottom: '10px' }}>Upload Property Photos</div>
            <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.65)', marginBottom: '14px' }}>
              Upload up to 15 property photos, a PDF brochure/marketing kit (every photo inside it is
              extracted automatically), or an entire folder of photos at once. Claude reads these to write
              your listing description, and they'll be saved to the listing for social media posts.
            </div>
            <input type="file" accept="image/*,application/pdf" ref={stagePhotoRef} multiple style={{ display: 'none' }} onChange={handleStagePhotos} />
            <input type="file" accept="image/*" ref={stageFolderRef} multiple webkitdirectory="" directory="" style={{ display: 'none' }} onChange={handleStagePhotos} />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn-gold" type="button" style={{ maxWidth: '320px' }}
                onClick={() => stagePhotoRef.current.click()} disabled={photoStageLoading}
              >
                {photoStageLoading ? <><span className="spinner" />{photoStageLoadingLabel}</> : 'Upload Property Photos or PDF'}
              </button>
              <button
                type="button"
                onClick={() => stageFolderRef.current.click()} disabled={photoStageLoading}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: '#F0C84A',
                  padding: '0 20px',
                  borderRadius: '3px',
                  cursor: photoStageLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontFamily: "'Montserrat', sans-serif",
                  opacity: photoStageLoading ? 0.5 : 1
                }}
              >
                Upload From a Folder
              </button>
            </div>

            {photoStageError && <div className="error-msg" style={{ marginTop: '12px' }}>{photoStageError}</div>}
            {photoStageSuccess && <div className="success-msg" style={{ marginTop: '12px' }}>{photoStageSuccess}</div>}

            {stagedPhotoUrls.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {stagedPhotoUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={url} alt={`Property ${i + 1}`}
                      style={{ width: '150px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeStagedPhoto(i)}
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
          </div>
        )}

        {!isEditing && (
          <div className="form-checkbox">
            <input type="checkbox" id="declaration" checked={declaration} onChange={e => setDeclaration(e.target.checked)} />
            <label htmlFor="declaration">I confirm all details are accurate and truthful.</label>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}
        {saveSuccess && <div className="success-msg">{saveSuccess}</div>}

        {districtGateOpen && (
          <div style={{
            background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)',
            borderRadius: '4px', padding: '14px 16px', marginTop: '12px'
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.9)', marginBottom: '10px' }}>
              ⚠️ We auto-filled the District as "{(SG_DISTRICTS.find(d => d.value === form.district) || {}).label || `District ${form.district}`}" — please confirm it's correct before generating.
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button" onClick={confirmDistrictAndMaybeGenerate}
                style={{
                  background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)',
                  color: '#F0C84A', padding: '7px 16px', borderRadius: '3px', cursor: 'pointer',
                  fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
                }}
              >
                ✓ Yes, that's correct — Generate
              </button>
              <button
                type="button" onClick={jumpToDistrictField}
                style={{
                  background: 'transparent', border: '1px solid rgba(248,244,236,0.25)',
                  color: 'rgba(248,244,236,0.7)', padding: '7px 16px', borderRadius: '3px', cursor: 'pointer',
                  fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
                }}
              >
                Change District
              </button>
            </div>
          </div>
        )}

        {priceGateOpen && (
          <div style={{
            background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)',
            borderRadius: '4px', padding: '14px 16px', marginTop: '12px'
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.9)', marginBottom: '10px' }}>
              ⚠️ We auto-filled the Price as "SGD {form.price}M" — please confirm it's correct before generating.
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button" onClick={confirmPriceAndMaybeGenerate}
                style={{
                  background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)',
                  color: '#F0C84A', padding: '7px 16px', borderRadius: '3px', cursor: 'pointer',
                  fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
                }}
              >
                ✓ Yes, that's correct — Generate
              </button>
              <button
                type="button" onClick={jumpToPriceField}
                style={{
                  background: 'transparent', border: '1px solid rgba(248,244,236,0.25)',
                  color: 'rgba(248,244,236,0.7)', padding: '7px 16px', borderRadius: '3px', cursor: 'pointer',
                  fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
                }}
              >
                Change Price
              </button>
            </div>
          </div>
        )}

        {bathroomsGateOpen && (
          <div style={{
            background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)',
            borderRadius: '4px', padding: '14px 16px', marginTop: '12px'
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.9)', marginBottom: '10px' }}>
              ⚠️ We weren't confident about Bathrooms from your screenshots{form.bathrooms ? ` (currently "${form.bathrooms}")` : ' (currently blank)'} — please confirm or fill it in before generating.
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button" onClick={confirmBathroomsAndMaybeGenerate}
                style={{
                  background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)',
                  color: '#F0C84A', padding: '7px 16px', borderRadius: '3px', cursor: 'pointer',
                  fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
                }}
              >
                ✓ Yes, that's correct — Generate
              </button>
              <button
                type="button" onClick={jumpToBathroomsField}
                style={{
                  background: 'transparent', border: '1px solid rgba(248,244,236,0.25)',
                  color: 'rgba(248,244,236,0.7)', padding: '7px 16px', borderRadius: '3px', cursor: 'pointer',
                  fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
                }}
              >
                Change Bathrooms
              </button>
            </div>
          </div>
        )}

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
          <button className="btn-primary" type="submit" disabled={loading || photoStageLoading}>
            {loading
              ? <><span className="spinner" />{isEditing ? 'Saving...' : 'Generating your listing...'}</>
              : photoStageLoading
              ? <><span className="spinner" />Waiting for photos to finish uploading...</>
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
                {editingContent ? (
                  <>
                    <textarea
                      className="form-textarea"
                      rows={16}
                      value={editedContent}
                      onChange={e => setEditedContent(e.target.value)}
                    />
                    {contentSaveError && <div className="error-msg" style={{ marginTop: '8px' }}>{contentSaveError}</div>}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button
                        type="button" onClick={cancelEditContent} disabled={contentSaving}
                        style={{
                          background: 'transparent', border: '1px solid rgba(212,175,55,0.5)',
                          color: '#F0C84A', padding: '8px 18px', borderRadius: '3px',
                          cursor: 'pointer', fontSize: '13px', fontFamily: "'Montserrat', sans-serif"
                        }}
                      >
                        Cancel
                      </button>
                      <button className="btn-primary" type="button" onClick={saveEditContent} disabled={contentSaving} style={{ maxWidth: '160px' }}>
                        {contentSaving ? <><span className="spinner" />Saving...</> : 'Save'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="listing-text">{result.listing.content}</div>
                    <button
                      className="btn-gold" type="button" onClick={startEditContent}
                      style={{ maxWidth: '220px', marginTop: '12px' }}
                    >
                      ✏️ Edit Write-Up
                    </button>
                    {contentSaveSuccess && <div className="success-msg" style={{ marginTop: '10px' }}>{contentSaveSuccess}</div>}
                  </>
                )}
              </div>

              <div className="divider" />
              <div className="section-label">Step 3 - Your Listing Photos</div>

              {uploadedPhotoUrls.length > 0 ? (
                <>
                  <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.65)', marginBottom: '14px' }}>
                    These photos are saved to your listing and ready for social media posts.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                  {!showReplacePhotos && (
                    <button
                      type="button" onClick={() => setShowReplacePhotos(true)}
                      style={{
                        marginTop: '10px', background: 'transparent', border: 'none',
                        color: '#F0C84A', textDecoration: 'underline', cursor: 'pointer',
                        fontSize: '12px', fontFamily: "'Montserrat', sans-serif", padding: 0
                      }}
                    >
                      Replace All Photos
                    </button>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.65)', marginBottom: '14px' }}>
                  No photos on this listing yet — upload some below so they're saved and ready for social media posts.
                </div>
              )}

              {(uploadedPhotoUrls.length === 0 || showReplacePhotos) && (
                <div style={uploadedPhotoUrls.length > 0 ? { marginTop: '14px' } : undefined}>
                  {uploadedPhotoUrls.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '10px' }}>
                      Uploading here replaces all {uploadedPhotoUrls.length} existing photo{uploadedPhotoUrls.length === 1 ? '' : 's'} on this listing — it doesn't add to them.
                    </div>
                  )}
                  <input type="file" accept="image/*,application/pdf" ref={photoRef} multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
                  <input type="file" accept="image/*" ref={folderRef} multiple webkitdirectory="" directory="" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-gold" type="button" style={{ maxWidth: '320px' }}
                      onClick={() => photoRef.current.click()} disabled={photoLoading}
                    >
                      {photoLoading ? <><span className="spinner" />{photoLoadingLabel}</> : uploadedPhotoUrls.length > 0 ? 'Replace With New Photos or PDF' : 'Upload Property Photos or PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => folderRef.current.click()} disabled={photoLoading}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(212,175,55,0.4)',
                        color: '#F0C84A',
                        padding: '0 20px',
                        borderRadius: '3px',
                        cursor: photoLoading ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontFamily: "'Montserrat', sans-serif",
                        opacity: photoLoading ? 0.5 : 1
                      }}
                    >
                      Upload From a Folder
                    </button>
                    {showReplacePhotos && (
                      <button
                        type="button" onClick={() => setShowReplacePhotos(false)} disabled={photoLoading}
                        style={{
                          background: 'transparent', border: '1px solid rgba(248,244,236,0.25)',
                          color: 'rgba(248,244,236,0.6)', padding: '0 16px', borderRadius: '3px',
                          cursor: photoLoading ? 'not-allowed' : 'pointer', fontSize: '13px',
                          fontFamily: "'Montserrat', sans-serif", opacity: photoLoading ? 0.5 : 1
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {photoError && <div className="error-msg" style={{ marginTop: '12px' }}>{photoError}</div>}
                  {photoSuccess && <div className="success-msg" style={{ marginTop: '12px' }}>{photoSuccess}</div>}
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
