import React, { useState, useEffect, useMemo } from 'react';
import type { CheckIn } from '../../shared/types';
import './AnalyticsPage.css';

interface WordFrequency {
  word: string;
  count: number;
}

interface TaskTagStats {
  taskTag: string;
  total: number;
  onTaskCount: number;
  offTaskCount: number;
  flowRatings: number[];
  avgFlowRating: number;
  lowFlowCount: number;
  lowFlowRate: number;
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

interface CommentDetail {
  comment: string;
  timestamp: string;
  chunkName: string;
  flowRating: number;
  moodRating?: number;
  onTask: boolean;
  taskTag?: string;
}

function AnalyticsPage(): React.ReactElement {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordComments, setWordComments] = useState<CommentDetail[]>([]);
  const [wordCategory, setWordCategory] = useState<string>('');

  useEffect(() => {
    loadCheckIns();
  }, []);

  // Handle clicking on a word to show related comments
  const handleWordClick = (word: string, category: string) => {
    const matchingCheckIns = filteredCheckIns.filter(
      (c) => c.comments && extractWords(c.comments).includes(word.toLowerCase())
    );

    const comments: CommentDetail[] = matchingCheckIns.map((c) => ({
      comment: c.comments!,
      timestamp: c.timestamp,
      chunkName: c.chunkName || 'Unknown Chunk',
      flowRating: c.flowRating,
      moodRating: c.moodRating,
      onTask: c.onTask,
      taskTag: c.taskTag,
    }));

    // Sort by timestamp descending (most recent first)
    comments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setSelectedWord(word);
    setWordComments(comments);
    setWordCategory(category);
  };

  const closeModal = () => {
    setSelectedWord(null);
    setWordComments([]);
    setWordCategory('');
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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

  // Task tag stats - what tasks are being worked on when on-task vs off-task
  const taskTagStats = useMemo((): TaskTagStats[] => {
    const statsMap = new Map<string, { total: number; onTaskCount: number; offTaskCount: number; flowRatings: number[]; lowFlowCount: number }>();

    for (const checkIn of filteredCheckIns) {
      const tag = checkIn.taskTag?.trim();
      if (!tag) continue;

      if (!statsMap.has(tag)) {
        statsMap.set(tag, { total: 0, onTaskCount: 0, offTaskCount: 0, flowRatings: [], lowFlowCount: 0 });
      }
      const stats = statsMap.get(tag)!;
      stats.total++;
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

    return Array.from(statsMap.entries())
      .map(([taskTag, stats]) => ({
        taskTag,
        total: stats.total,
        onTaskCount: stats.onTaskCount,
        offTaskCount: stats.offTaskCount,
        flowRatings: stats.flowRatings,
        avgFlowRating: stats.flowRatings.length > 0
          ? stats.flowRatings.reduce((a, b) => a + b, 0) / stats.flowRatings.length
          : 0,
        lowFlowCount: stats.lowFlowCount,
        lowFlowRate: stats.total > 0 ? stats.lowFlowCount / stats.total : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredCheckIns]);

  // Top on-task tags (tags most commonly used when on-task)
  const topOnTaskTags = useMemo(() =>
    [...taskTagStats].filter(s => s.onTaskCount > 0).sort((a, b) => b.onTaskCount - a.onTaskCount).slice(0, 5),
    [taskTagStats]
  );

  // Top off-task tags (tags most commonly used when off-task)
  const topOffTaskTags = useMemo(() =>
    [...taskTagStats].filter(s => s.offTaskCount > 0).sort((a, b) => b.offTaskCount - a.offTaskCount).slice(0, 5),
    [taskTagStats]
  );

  // Flow state by task - highest and lowest flow tasks
  const highestFlowTasks = useMemo(() =>
    [...taskTagStats].filter(s => s.total >= 2).sort((a, b) => b.avgFlowRating - a.avgFlowRating).slice(0, 5),
    [taskTagStats]
  );

  const lowestFlowTasks = useMemo(() =>
    [...taskTagStats].filter(s => s.total >= 2).sort((a, b) => a.avgFlowRating - b.avgFlowRating).slice(0, 5),
    [taskTagStats]
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

      {/* Flow State by Task */}
      {taskTagStats.length > 0 && highestFlowTasks.length > 0 && (
        <div className="analytics-grid">
          <div className="analytics-section card">
            <h2 className="section-title">Flow State by Task</h2>
            <p className="section-description">Which tasks put you in the best flow state</p>

            <h3 className="subsection-title best">Highest Flow</h3>
            <div className="chunk-list">
              {highestFlowTasks.map((stat) => (
                <div key={stat.taskTag} className="chunk-stat-row">
                  <span className="chunk-name">{stat.taskTag}</span>
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

            {lowestFlowTasks.length > 0 && lowestFlowTasks[0].avgFlowRating < highestFlowTasks[0].avgFlowRating && (
              <>
                <h3 className="subsection-title needs-work">Lowest Flow</h3>
                <div className="chunk-list">
                  {lowestFlowTasks.slice(0, 3).map((stat) => (
                    <div key={stat.taskTag} className="chunk-stat-row">
                      <span className="chunk-name">{stat.taskTag}</span>
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
          </div>
        </div>
      )}

      {/* Task Tag Analysis */}
      {taskTagStats.length > 0 && (
        <div className="analytics-grid">
          <div className="analytics-section card">
            <h2 className="section-title">Tasks When On-Task</h2>
            <p className="section-description">What you're actually working on when staying on schedule</p>

            {topOnTaskTags.length === 0 ? (
              <p className="no-data">No task tags recorded for on-task check-ins yet</p>
            ) : (
              <div className="chunk-list">
                {topOnTaskTags.map((stat) => (
                  <div key={stat.taskTag} className="chunk-stat-row">
                    <span className="chunk-name">{stat.taskTag}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar on-task"
                        style={{ width: `${(stat.onTaskCount / Math.max(...topOnTaskTags.map(t => t.onTaskCount))) * 100}%` }}
                      />
                    </div>
                    <span className="stat-value">{stat.onTaskCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="analytics-section card">
            <h2 className="section-title">Tasks When Off-Task</h2>
            <p className="section-description">What's distracting you from your scheduled work</p>

            {topOffTaskTags.length === 0 ? (
              <p className="no-data">No task tags recorded for off-task check-ins yet</p>
            ) : (
              <div className="chunk-list">
                {topOffTaskTags.map((stat) => (
                  <div key={stat.taskTag} className="chunk-stat-row">
                    <span className="chunk-name">{stat.taskTag}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar off-task"
                        style={{ width: `${(stat.offTaskCount / Math.max(...topOffTaskTags.map(t => t.offTaskCount))) * 100}%` }}
                      />
                    </div>
                    <span className="stat-value">{stat.offTaskCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                    <span
                      key={w.word}
                      className="word-tag clickable"
                      style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}
                      onClick={() => handleWordClick(w.word, 'High Flow')}
                    >
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
                    <span
                      key={w.word}
                      className="word-tag clickable"
                      style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}
                      onClick={() => handleWordClick(w.word, 'Low Flow')}
                    >
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
                    <span
                      key={w.word}
                      className="word-tag clickable"
                      style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}
                      onClick={() => handleWordClick(w.word, 'On Task')}
                    >
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
                    <span
                      key={w.word}
                      className="word-tag clickable"
                      style={{ fontSize: `${Math.min(18, 12 + w.count * 2)}px` }}
                      onClick={() => handleWordClick(w.word, 'Off Task')}
                    >
                      {w.word} <span className="word-count">({w.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for showing comments containing a word */}
      {selectedWord && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Comments containing "{selectedWord}"
                <span className="modal-category">{wordCategory}</span>
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {wordComments.length === 0 ? (
                <p className="no-data">No comments found</p>
              ) : (
                <div className="comment-list">
                  {wordComments.map((item, index) => (
                    <div key={index} className="comment-item">
                      <div className="comment-meta">
                        <span className="comment-time">{formatTimestamp(item.timestamp)}</span>
                        <span className="comment-chunk">{item.chunkName}</span>
                      </div>
                      <div className="comment-indicators">
                        <span className={`indicator ${item.onTask ? 'on-task' : 'off-task'}`}>
                          {item.onTask ? 'On Task' : 'Off Task'}
                        </span>
                        {item.taskTag && (
                          <span className="task-tag-badge">{item.taskTag}</span>
                        )}
                        <span className="indicator flow">Flow: {item.flowRating}/5</span>
                        {item.moodRating && (
                          <span className="indicator mood">Mood: {item.moodRating}/5</span>
                        )}
                      </div>
                      <p className="comment-text">{item.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
