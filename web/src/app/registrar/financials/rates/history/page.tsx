'use client';

import { useState, useEffect } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getRateHistory, getRatesForDate } from '@/services/rateService';

function rateChangeDiff(oldRates: any[], newRates: any[]) {
  const diff = {
    regular: (newRates[0]?.regular_rate ?? 0) - (oldRates[0]?.regular_rate ?? 0),
    social: (newRates[0]?.social_rate ?? 0) - (oldRates[0]?.social_rate ?? 0),
    student: (newRates[0]?.student_rate ?? 0) - (oldRates[0]?.student_rate ?? 0),
  };

  return {
    regular: Math.abs(diff.regular) > 0.01 ? diff.regular : 0,
    social: Math.abs(diff.social) > 0.01 ? diff.social : 0,
    student: Math.abs(diff.student) > 0.01 ? diff.student : 0,
  };
}

export default function RateHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'compare'>('timeline');
  const [loading, setLoading] = useState(true);

  // Comparison State
  const [dateA, setDateA] = useState('');
  const [dateB, setDateB] = useState('');
  const [ratesA, setRatesA] = useState<any[]>([]);
  const [ratesB, setRatesB] = useState<any[]>([]);
  const [comparisonDone, setComparisonDone] = useState(false);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    getRateHistory()
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  const handleCompare = async () => {
    if (!dateA || !dateB) return;
    setCompLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        getRatesForDate(new Date(dateA)),
        getRatesForDate(new Date(dateB)),
      ]);
      setRatesA(resA);
      setRatesB(resB);
      setComparisonDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCompLoading(false);
    }
  };

  const diff = ratesA.length && ratesB.length ? rateChangeDiff(ratesA, ratesB) : null;

  return (
    <RegistrarShell title="Rate Audit & History" subtitle="Track historical rate changes and perform chronological comparisons">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-6 font-medium text-sm transition-all border-b-2 -mb-px ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Timeline of Changes
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`py-3 px-6 font-medium text-sm transition-all border-b-2 -mb-px ${
              activeTab === 'compare'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Side-by-Side Comparison Tool
          </button>
        </div>

        {activeTab === 'timeline' ? (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center text-gray-500 border border-gray-100 dark:border-gray-800">
                No rate change history records found.
              </div>
            ) : (
              <div className="relative border-l-2 border-indigo-100 dark:border-indigo-900 ml-4 md:ml-6 space-y-6 py-2">
                {history.map((item, idx) => (
                  <div key={item.id || idx} className="relative pl-6 md:pl-8">
                    {/* Badge pin */}
                    <div className="absolute -left-2 top-1.5 w-4.5 h-4.5 rounded-full bg-indigo-600 border-4 border-white dark:border-gray-950 flex items-center justify-center shadow-sm"></div>
                    
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-550 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            Assessment Year: {item.year}
                          </span>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mt-1.5">
                            Rate Configuration Update
                          </h3>
                        </div>
                        <div className="text-right text-xs text-gray-450">
                          <span className="font-medium text-gray-600 dark:text-gray-305">Effective:</span> {new Date(item.effective_from).toLocaleDateString()}<br />
                          {item.effective_until ? (
                            <>
                              <span className="font-medium text-gray-600 dark:text-gray-305">Until:</span> {new Date(item.effective_until).toLocaleDateString()}
                            </>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded">Currently Active</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-850 pt-3">
                        <div className="bg-gray-50 dark:bg-gray-850/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Regular Rate</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">₵{parseFloat(item.regular_rate).toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-850/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Social Rate</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">₵{parseFloat(item.social_rate).toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-850/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Student Rate</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">₵{parseFloat(item.student_rate).toFixed(2)}</p>
                        </div>
                      </div>

                      {item.change_reason && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-300 text-sm rounded-lg p-3.5 border border-indigo-100/50 dark:border-indigo-900/30">
                          <span className="font-semibold text-xs uppercase block tracking-wider mb-1">Reason for Change</span>
                          {item.change_reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-lg text-gray-950 dark:text-gray-50">Compare Rates Between Two Dates</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Date A</label>
                  <input
                    type="date"
                    value={dateA}
                    onChange={(e) => setDateA(e.target.value)}
                    className="w-full bg-gray-55/30 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Date B</label>
                  <input
                    type="date"
                    value={dateB}
                    onChange={(e) => setDateB(e.target.value)}
                    className="w-full bg-gray-55/30 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCompare}
                  disabled={!dateA || !dateB || compLoading}
                  className="bg-indigo-650 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm flex items-center gap-2"
                >
                  {compLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Compare Dates
                </button>
              </div>
            </div>

            {comparisonDone && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column Date A */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 dark:border-gray-850 pb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Rates Active on Date A</h4>
                    <span className="text-xs text-gray-500 font-medium">{new Date(dateA).toLocaleDateString()}</span>
                  </div>
                  {ratesA.length === 0 ? (
                    <p className="text-gray-500 text-sm">No rates active on this date.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Regular</span>
                        <span className="font-bold">₵{parseFloat(ratesA[0].regular_rate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Social</span>
                        <span className="font-bold">₵{parseFloat(ratesA[0].social_rate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Student</span>
                        <span className="font-bold">₵{parseFloat(ratesA[0].student_rate).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column Date B */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 dark:border-gray-850 pb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Rates Active on Date B</h4>
                    <span className="text-xs text-gray-500 font-medium">{new Date(dateB).toLocaleDateString()}</span>
                  </div>
                  {ratesB.length === 0 ? (
                    <p className="text-gray-500 text-sm">No rates active on this date.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Regular</span>
                        <span className="font-bold">₵{parseFloat(ratesB[0].regular_rate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Social</span>
                        <span className="font-bold">₵{parseFloat(ratesB[0].social_rate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Student</span>
                        <span className="font-bold">₵{parseFloat(ratesB[0].student_rate).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comparative Diffs */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 dark:border-gray-850 pb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Net Rate Difference</h4>
                    <span className="text-xs text-gray-500 font-medium">Difference (Date B - Date A)</span>
                  </div>
                  {diff ? (
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Regular Change</span>
                        <span className={`font-bold ${diff.regular > 0 ? 'text-green-600' : diff.regular < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {diff.regular > 0 ? '+' : ''}₵{diff.regular.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Social Change</span>
                        <span className={`font-bold ${diff.social > 0 ? 'text-green-600' : diff.social < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {diff.social > 0 ? '+' : ''}₵{diff.social.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-850">
                        <span className="text-gray-600 dark:text-gray-400">Student Change</span>
                        <span className={`font-bold ${diff.student > 0 ? 'text-green-600' : diff.student < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {diff.student > 0 ? '+' : ''}₵{diff.student.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Cannot calculate difference.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </RegistrarShell>
  );
}
