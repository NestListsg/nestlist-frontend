import React, { useState, useRef, useEffect } from 'react';
import { millionsToFullNumber, fullNumberToMillions } from '../utils/format';

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
  property_type: 'Good Class Bungalow (GCB)', location: '', district: '', land_size: 0,
  built_up: 0, bedrooms: '', bathrooms: '', price: '', features: '',
  plot_width: 0, plot_depth: 0, storeys: 0, site_coverage: 0,
  sg_citizen: true, code: ''
};

export default function NewListing({ agent, token, editingListing, onDoneEditing }) {
  const isEditing = !!editingListing;
  const isConvertingSeller = isEditing && editingListing.status === 'lead';
  const [form, setForm] = useState(() => {
    if (editingListing) {
      return {
        property_type: editingListing.property_type || DEFAULT_FORM.property_type,
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
        code: editingListing.code || ''
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
  const fileRef = useRef();
  const photoRef = useRef();
  const folderRef = useRef();
  const stagePhotoRef = useRef();
  const stageFolderRef = useRef();
  const districtSelectRef = useRef();
  const priceInputRef = useRef();

  // Persist form to localStorage whenever it changes (skip while editing an existing listing)
  useEffect(() => {
    if (isEditing) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form, isEditing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // sg_citizen defaults to true - GCB/landed purchases are Singapore Citizens only

  // Backend's upload-images route accepts an upload_session id matching
  // [A-Za-z0-9_-]{1,64}. crypto.randomUUID() satisfies that directly (36 hex
  // chars + hyphens), with a manual fallback for older browsers that lack it.
  const genUploadSession = () => {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch {}
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
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
    setImagePreviews([]);
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
      if (extracted.price) {
        extracted.price = fullNumberToMillions(extracted.price);
        setPriceAutofilled(true);
        setPriceConfirmed(false);
        setPriceGateOpen(false);
      }
      // Pre-select district only when Smart Fill actually detected one --
      // never overwrite an existing/blank selection with an empty value.
      // We never guess the district ourselves (e.g. from the street); it's
      // either read here from what the backend detected, or picked by hand.
      // Smart Fill's district guess isn't always right, so mark it as an
      // unconfirmed auto-fill -- the warning banner and the generate-time
      // gate both key off this pair of flags.
      if (extracted.district === undefined || extracted.district === null || extracted.district === '') {
        delete extracted.district;
      } else {
        extracted.district = String(extracted.district);
        setDistrictAutofilled(true);
        setDistrictConfirmed(false);
        setDistrictGateOpen(false);
      }
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
    if (!form.property_type) {
      setPropertyTypeInvalid(true);
      setError('Please select a property type before continuing.');
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
    if (districtNeedsConfirm || priceNeedsConfirm) {
      setPropertyTypeInvalid(false);
      setError('');
      setDistrictGateOpen(districtNeedsConfirm);
      setPriceGateOpen(priceNeedsConfirm);
      return;
    }
    setPropertyTypeInvalid(false);
    setDistrictGateOpen(false);
    setPriceGateOpen(false);
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
    doSubmit();
  };

  const confirmPriceAndMaybeGenerate = () => {
    setPriceConfirmed(true);
    setPriceGateOpen(false);
    if (districtAutofilled && !districtConfirmed) { setDistrictGateOpen(true); return; }
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

  const doSubmit = async () => {
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
        body: JSON.stringify({ ...payload, photo_urls: stagedPhotoUrls })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error generating listing');
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
              <label className="form-label">2b. District (optional)</label>
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
              <label className="form-label">8. Asking Price (SGD, in Millions) (optional)</label>
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
                placeholder="e.g. 25.7 (leave blank if not set yet)"
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
