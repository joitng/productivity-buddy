import React, { useState, useEffect, useMemo } from 'react';
import type { CheckIn } from '../../shared/types';
import './AnalyticsPage.css';

interface ChunkStats {
  chunkName: string;
  totalCheckIns: number;
  onTaskCount: number;
  offTaskCount: number;
  onTaskRate: number;
  offTaskRate: number;
  avgFlowRating: number;
  flowRatings: number[];
  lowFlowCount: number;
  lowFlowRate: number;
}

interface WordFrequency {
  word: string;
  count: number;
}

// Common words to filter out (keeping nouns, adjectives, and action verbs)
const STOP_WORDS = new Set([
  // Articles, conjunctions, prepositions
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'again', 'further', 'about', 'against', 'along', 'around',
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  // Question words and relative pronouns
  'when', 'where', 'why', 'how',
  // Quantifiers and determiners
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'any', 'many', 'much',
  // Auxiliary/modal verbs (not action verbs)
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'done', 'doing',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  // Adverbs
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  'once', 'if', 'because', 'until', 'while', 'really', 'still', 'already',
  'always', 'never', 'often', 'sometimes', 'usually', 'probably', 'maybe',
  'almost', 'enough', 'quite', 'rather', 'even', 'ever', 'yet', 'soon',
  'actually', 'certainly', 'definitely', 'especially', 'exactly', 'finally',
  'generally', 'however', 'instead', 'likely', 'mainly', 'merely', 'nearly',
  'perhaps', 'simply', 'therefore', 'thus', 'together', 'totally',
  // Contractions and informal
  'im', 'ive', 'dont', 'didnt', 'cant', 'wont', 'isnt', 'arent', 'wasnt',
  'werent', 'hasnt', 'havent', 'hadnt', 'doesnt', 'couldnt', 'shouldnt',
  'wouldnt', 'youre', 'theyre', 'weve', 'theyve', 'youve', 'itll', 'thatll',
  // Generic/vague words
  'thing', 'things', 'stuff', 'lot', 'bit', 'way', 'something', 'anything',
  'everything', 'nothing', 'someone', 'anyone', 'everyone', 'nobody',
  'like', 'kind', 'sort', 'type', 'part', 'number', 'point', 'fact',
  'able', 'okay', 'yeah', 'yes', 'yep', 'nope', 'got', 'get', 'getting',
]);

function AnalyticsPage(): React.ReactElement {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    loadCheckIns();
  }, []);

  const loadCheckIns = async () => {
    try {
      const data = await window.electronAPI.checkIns.getAll();
      setCheckIns(data);
    } catch (error) {
      console.error('Failed to load check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter check-ins by time range
  const filteredCheckIns = useMemo(() => {
    if (timeRange === 'all') return checkIns;

    const now = new Date();
    const cutoff = new Date();
    if (timeRange === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      cutoff.setMonth(now.getMonth() - 1);
    }

    return checkIns.filter((c) => new Date(c.timestamp) >= cutoff);
  }, [checkIns, timeRange]);

  // Calculate stats by chunk
  const chunkStats = useMemo((): ChunkStats[] => {
    const statsMap = new Map<string, {
      totalCheckIns: number;
      onTaskCount: number;
      offTaskCount: number;
      flowRatings: number[];
      lowFlowCount: number;
    }>();

    for (const checkIn of filteredCheckIns) {
      const name = checkIn.chunkName || 'Unknown Chunk';
      if (!statsMap.has(name)) {
        statsMap.set(name, { totalCheckIns: 0, onTaskCount: 0, offTaskCount: 0, flowRatings: [], lowFlowCount: 0 });
      }
      const stats = statsMap.get(name)!;
      stats.totalCheckIns++;
      if (checkIn.onTask) {
        stats.onTaskCount++;
      } else {
        stats.offTaskCount++;
      }
      stats.flowRatings.push(checkIn.flowRating);
      if (checkIn.flowRating <= 2) {
        stats.lowFlowCount++;
      }
    }

    return Array.from(statsMap.entries()).map(([chunkName, stats]) => ({
      chunkName,
      totalCheckIns: stats.totalCheckIns,
      onTaskCount: stats.onTaskCount,
      offTaskCount: stats.offTaskCount,
      onTaskRate: stats.totalCheckIns > 0 ? stats.onTaskCount / stats.totalCheckIns : 0,
      offTaskRate: stats.totalCheckIns > 0 ? stats.offTaskCount / stats.totalCheckIns : 0,
      avgFlowRating: stats.flowRatings.length > 0
        ? stats.flowRatings.reduce((a, b) => a + b, 0) / stats.flowRatings.length
        : 0,
      flowRatings: stats.flowRatings,
      lowFlowCount: stats.lowFlowCount,
      lowFlowRate: stats.totalCheckIns > 0 ? stats.lowFlowCount / stats.totalCheckIns : 0,
    }));
  }, [filteredCheckIns]);

  // Sort for different views
  const mostOnTask = useMemo(() =>
    [...chunkStats].filter(s => s.totalCheckIns >= 3).sort((a, b) => b.onTaskRate - a.onTaskRate),
    [chunkStats]
  );

  const leastOnTask = useMemo(() =>
    [...chunkStats].filter(s => s.totalCheckIns >= 3).sort((a, b) => a.onTaskRate - b.onTaskRate),
    [chunkStats]
  );

  const highestFlow = useMemo(() =>
    [...chunkStats].filter(s => s.totalCheckIns >= 3).sort((a, b) => b.avgFlowRating - a.avgFlowRating),
    [chunkStats]
  );

  const lowestFlow = useMemo(() =>
    [...chunkStats].filter(s => s.totalCheckIns >= 3).sort((a, b) => a.avgFlowRating - b.avgFlowRating),
    [chunkStats]
  );

  // Most off-task by chunk (sorted by off-task rate)
  const mostOffTask = useMemo(() =>
    [...chunkStats].filter(s => s.totalCheckIns >= 3 && s.offTaskCount > 0).sort((a, b) => b.offTaskRate - a.offTaskRate),
    [chunkStats]
  );

  // Most negative flow by chunk (sorted by low flow rate, i.e., percentage of check-ins with flow <= 2)
  const mostNegativeFlow = useMemo(() =>
    [...chunkStats].filter(s => s.totalCheckIns >= 3 && s.lowFlowCount > 0).sort((a, b) => b.lowFlowRate - a.lowFlowRate),
    [chunkStats]
  );

  // Extract words from comments
  const extractWords = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  };

  // Get word frequencies
  const getWordFrequencies = (comments: string[]): WordFrequency[] => {
    const wordCounts = new Map<string, number>();

    for (const comment of comments) {
      const words = extractWords(comment);
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    return Array.from(wordCounts.entries())
      .map(([word, count]) => ({ word, count }))
      .filter((w) => w.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  };

  // Common words analysis
  const wordAnalysis = useMemo(() => {
    const highFlowComments = filteredCheckIns
      .filter((c) => c.flowRating >= 4 && c.comments)
      .map((c) => c.comments!);

    const lowFlowComments = filteredCheckIns
      .filter((c) => c.flowRating <= 2 && c.comments)
      .map((c) => c.comments!);

    const onTaskComments = filteredCheckIns
      .filter((c) => c.onTask && c.comments)
      .map((c) => c.comments!);

    const offTaskComments = filteredCheckIns
      .filter((c) => !c.onTask && c.comments)
      .map((c) => c.comments!);

    return {
      highFlow: getWordFrequencies(highFlowComments),
      lowFlow: getWordFrequencies(lowFlowComments),
      onTask: getWordFrequencies(onTaskComments),
      offTask: getWordFrequencies(offTaskComments),
    };
  }, [filteredCheckIns]);

  // Overall stats
  const overallStats = useMemo(() => {
    const total = filteredCheckIns.length;
    const onTask = filteredCheckIns.filter((c) => c.onTask).length;
    const avgFlow = total > 0
      ? filteredCheckIns.reduce((sum, c) => sum + c.flowRating, 0) / total
      : 0;

    return {
      total,
      onTaskRate: total > 0 ? onTask / total : 0,
      avgFlow,
    };
  }, [filteredCheckIns]);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="analytics-page">
        <h1 className="page-title">Analytics</h1>
        <div className="empty-state card">
          <p>No check-in data yet. Complete some check-ins to see your analytics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <div className="time-range-selector">
          <button
            className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            Past Week
          </button>
          <button
            className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Past Month
          </button>
          <button
            className={`range-btn ${timeRange === 'all' ? 'active' : ''}`}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="summary-cards">
        <div className="summary-card card">
          <div className="summary-value">{filteredCheckIns.length}</div>
          <div className="summary-label">Total Check-ins</div>
        </div>
        <div className="summary-card card">
          <div className="summary-value">{(overallStats.onTaskRate * 100).toFixed(0)}%</div>
          <div className="summary-label">On Task Rate</div>
        </div>
        <div className="summary-card card">
          <div className="summary-value">{overallStats.avgFlow.toFixed(1)}</div>
          <div className="summary-label">Avg Flow Rating</div>
        </div>
      </div>

      {/* Chunk Analysis */}
      <div className="analytics-grid">
        {/* On-Task Analysis */}
        <div className="analytics-section card">
          <h2 className="section-title">On-Task by Schedule Chunk</h2>
          <p className="section-description">Which chunks you're most likely to be working on what's scheduled</p>

          {mostOnTask.length === 0 ? (
            <p className="no-data">Need at least 3 check-ins per chunk for analysis</p>
          ) : (
            <>
              <h3 className="subsection-title best">Most On-Task</h3>
              <div className="chunk-list">
                {mostOnTask.slice(0, 5).map((stat) => (
                  <div key={stat.chunkName} className="chunk-stat-row">
                    <span className="chunk-name">{stat.chunkName}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar on-task"
                        style={{ width: `${stat.onTaskRate * 100}%` }}
                      />
                    </div>
                    <span className="stat-value">{(stat.onTaskRate * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              {leastOnTask.length > 0 && leastOnTask[0].onTaskRate < 1 && (
                <>
                  <h3 className="subsection-title needs-work">Least On-Task</h3>
                  <div className="chunk-list">
                    {leastOnTask.slice(0, 3).map((stat) => (
                      <div key={stat.chunkName} className="chunk-stat-row">
                        <span className="chunk-name">{stat.chunkName}</span>
                        <div className="stat-bar-container">
                          <div
                            className="stat-bar off-task"
                            style={{ width: `${stat.onTaskRate * 100}%` }}
                          />
                        </div>
                        <span className="stat-value">{(stat.onTaskRate * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Flow Analysis */}
        <div className="analytics-section card">
          <h2 className="section-title">Flow State by Schedule Chunk</h2>
          <p className="section-description">Which chunks you're most likely to be in a positive flow</p>

          {highestFlow.length === 0 ? (
            <p className="no-data">Need at least 3 check-ins per chunk for analysis</p>
          ) : (
            <>
              <h3 className="subsection-title best">Highest Flow</h3>
              <div className="chunk-list">
                {highestFlow.slice(0, 5).map((stat) => (
                  <div key={stat.chunkName} className="chunk-stat-row">
                    <span className="chunk-name">{stat.chunkName}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar high-flow"
                        style={{ width: `${(stat.avgFlowRating / 5) * 100}%` }}
                      />
                    </div>
                    <span className="stat-value">{stat.avgFlowRating.toFixed(1)}/5</span>
                  </div>
                ))}
              </div>

              {lowestFlow.length > 0 && lowestFlow[0].avgFlowRating < 5 && (
                <>
                  <h3 className="subsection-title needs-work">Lowest Flow</h3>
                  <div className="chunk-list">
                    {lowestFlow.slice(0, 3).map((stat) => (
                      <div key={stat.chunkName} className="chunk-stat-row">
                        <span className="chunk-name">{stat.chunkName}</span>
                        <div className="stat-bar-container">
                          <div
                            className="stat-bar low-flow"
                            style={{ width: `${(stat.avgFlowRating / 5) * 100}%` }}
                          />
                        </div>
                        <span className="stat-value">{stat.avgFlowRating.toFixed(1)}/5</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Off-Task and Negative Flow Analysis */}
      <div className="analytics-grid">
        {/* Off-Task by Chunk */}
        <div className="analytics-section card">
          <h2 className="section-title">Off-Task by Schedule Chunk</h2>
          <p className="section-description">Which chunks you're most often not working on what's scheduled</p>

          {mostOffTask.length === 0 ? (
            <p className="no-data">No off-task check-ins recorded yet (or need at least 3 per chunk)</p>
          ) : (
            <div className="chunk-list">
              {mostOffTask.slice(0, 5).map((stat) => (
                <div key={stat.chunkName} className="chunk-stat-row">
                  <span className="chunk-name">{stat.chunkName}</span>
                  <div className="stat-bar-container">
                    <div
                      className="stat-bar off-task"
                      style={{ width: `${stat.offTaskRate * 100}%` }}
                    />
                  </div>
                  <span className="stat-value">{(stat.offTaskRate * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Negative Flow by Chunk */}
        <div className="analytics-section card">
          <h2 className="section-title">Negative Flow by Schedule Chunk</h2>
          <p className="section-description">Which chunks you're most often in low flow (rating 1-2)</p>

          {mostNegativeFlow.length === 0 ? (
            <p className="no-data">No low flow check-ins recorded yet (or need at least 3 per chunk)</p>
          ) : (
            <div className="chunk-list">
              {mostNegativeFlow.slice(0, 5).map((stat) => (
                <div key={stat.chunkName} className="chunk-stat-row">
                  <span className="chunk-name">{stat.chunkName}</span>
                  <div className="stat-bar-container">
                    <div
                      className="stat-bar low-flow"
                      style={{ width: `${stat.lowFlowRate * 100}%` }}
                    />
                  </div>
                  <span className="stat-value">
                    {(stat.lowFlowRate * 100).toFixed(0)}%
                    <span className="stat-subvalue"> ({stat.lowFlowCount})</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Word Analysis */}
      <div className="analytics-grid">
        <div className="analytics-section card">
          <h2 className="section-title">Common Themes in Comments</h2>
          <p className="section-description">Words that frequently appear in your check-in notes</p>

          <div className="word-analysis-grid">
            <div className="word-group">
              <h3 className="word-group-title high-flow">When in High Flow (4-5)</h3>
              {wordAnalysis.highFlow.length === 0 ? (
                <p className="no-data">Not enough comments yet</p>
              ) : (
                <div className="word-cloud">
                  {wordAnalysis.highFlow.map((w) => (
                    <span key={w.word} className="word-tag" style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}>
                      {w.word} <span className="word-count">({w.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="word-group">
              <h3 className="word-group-title low-flow">When in Low Flow (1-2)</h3>
              {wordAnalysis.lowFlow.length === 0 ? (
                <p className="no-data">Not enough comments yet</p>
              ) : (
                <div className="word-cloud">
                  {wordAnalysis.lowFlow.map((w) => (
                    <span key={w.word} className="word-tag" style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}>
                      {w.word} <span className="word-count">({w.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="word-group">
              <h3 className="word-group-title on-task">When On Task</h3>
              {wordAnalysis.onTask.length === 0 ? (
                <p className="no-data">Not enough comments yet</p>
              ) : (
                <div className="word-cloud">
                  {wordAnalysis.onTask.map((w) => (
                    <span key={w.word} className="word-tag" style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}>
                      {w.word} <span className="word-count">({w.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="word-group">
              <h3 className="word-group-title off-task">When Off Task</h3>
              {wordAnalysis.offTask.length === 0 ? (
                <p className="no-data">Not enough comments yet</p>
              ) : (
                <div className="word-cloud">
                  {wordAnalysis.offTask.map((w) => (
                    <span key={w.word} className="word-tag" style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}>
                      {w.word} <span className="word-count">({w.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
