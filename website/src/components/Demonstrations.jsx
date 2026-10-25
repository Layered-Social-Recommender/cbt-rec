import React, { useState } from 'react';
import { DEMO_VIDEOS } from '../data/projectData';

export default function Demonstrations() {
  const [selectedVideo, setSelectedVideo] = useState(DEMO_VIDEOS[0]);

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Multimedia Demonstrations</span>
          <h2>System Walkthroughs &amp; Presentation Media</h2>
          <p className="section-description">
            Video walkthroughs of the CBT-Rec architecture, interactive recommendation engine, graph visualization, and viva presentation.
          </p>
        </div>

        {/* Video Embedding Guide Notice */}
        <div style={{ background: '#141417', border: '1px solid rgba(212, 168, 67, 0.3)', borderRadius: '8px', padding: '1.25rem 1.5rem', marginBottom: '3rem' }}>
          <h4 style={{ color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📹</span> Video Asset Integration Guide
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
            In compliance with project guidelines, video slots below feature structured timecoded agendas. To embed your uploaded recordings, simply update the <code style={{ color: '#ffffff' }}>embedUrl</code> attribute in <code style={{ color: '#ffffff' }}>src/data/projectData.js</code> with your YouTube embed URL (e.g. <code style={{ color: '#ffffff' }}>https://www.youtube.com/embed/VIDEO_ID</code>) or point to a local MP4 video file in the <code style={{ color: '#ffffff' }}>public/videos/</code> directory.
          </p>
        </div>

        {/* Featured Player Area */}
        <div className="card" style={{ marginBottom: '3.5rem', background: '#141417', border: '1px solid rgba(212, 168, 67, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: '0.35rem' }}>
                {selectedVideo.type}
              </span>
              <h3 style={{ fontSize: '1.6rem', color: '#ffffff', margin: 0 }}>
                {selectedVideo.title}
              </h3>
            </div>
            <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
              Duration: {selectedVideo.duration}
            </span>
          </div>

          {/* Interactive Player / Mock Screen */}
          <div className="video-preview" style={{ borderRadius: '12px', minHeight: '360px', marginBottom: '1.5rem' }}>
            {selectedVideo.embedUrl ? (
              <iframe
                src={selectedVideo.embedUrl}
                title={selectedVideo.title}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="play-button" style={{ margin: '0 auto 1.25rem' }}>
                  ▶
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                  Video Walkthrough Ready for Attachment
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
                  {selectedVideo.status}
                </div>
              </div>
            )}
            <div className="video-duration">{selectedVideo.duration}</div>
          </div>

          {/* Highlights and Timestamps */}
          <div className="grid-2" style={{ gap: '2rem' }}>
            <div>
              <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>Overview</h4>
              <p style={{ fontSize: '0.925rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                {selectedVideo.description}
              </p>
            </div>

            <div>
              <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>
                Presentation Agenda &amp; Timestamps:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selectedVideo.highlights.map((h, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {h}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Video Gallery Grid */}
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>
          All Demonstration Modules
        </h3>

        <div className="grid-2">
          {DEMO_VIDEOS.map((vid) => (
            <div 
              key={vid.id}
              className="card card-interactive"
              onClick={() => {
                setSelectedVideo(vid);
                window.scrollTo({ top: 350, behavior: 'smooth' });
              }}
              style={{
                borderColor: selectedVideo.id === vid.id ? '#d4a843' : 'rgba(255, 255, 255, 0.08)',
                background: selectedVideo.id === vid.id ? '#1c1c22' : '#141417'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                  {vid.type}
                </span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {vid.duration}
                </span>
              </div>

              <h4 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                {vid.title}
              </h4>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
                {vid.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', fontWeight: 600 }}>
                <span>Select to inspect details ➔</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{vid.highlights.length} sections</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
