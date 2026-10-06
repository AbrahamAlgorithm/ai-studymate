import { useState } from 'react'

const VideoCard = ({ video }) => {
    const [playing, setPlaying] = useState(false)
    if (!video?.videoId) return null

    const watchUrl = `https://www.youtube.com/watch?v=${video.videoId}`

    return (
        <div className="video-card">
            {playing ? (
                <div className="video-frame">
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1`}
                        title={video.title || 'YouTube video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            ) : (
                <button type="button" className="video-thumb" onClick={() => setPlaying(true)} aria-label="Play video">
                    {video.thumbnail && <img src={video.thumbnail} alt="" />}
                    <span className="video-play">▶</span>
                </button>
            )}
            <div className="video-meta">
                <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="video-title">
                    {video.title || 'YouTube video'}
                </a>
                {video.channel && <p className="video-channel">{video.channel}</p>}
                <p className={`video-badge ${video.transcriptAvailable ? 'ok' : 'warn'}`}>
                    {video.transcriptAvailable
                        ? 'Transcript loaded, answers come from the video'
                        : 'No captions on this one, answers use the title and description'}
                </p>
            </div>
        </div>
    )
}

export default VideoCard
