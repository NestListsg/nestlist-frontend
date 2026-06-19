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
      setImageSuccess(`✅ Details extracted from ${files.length} image${files.length > 1 ? 's' : ''}! Please review and adjust if needed.`);
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
