import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { FaCloudUploadAlt, FaFilePdf, FaFileWord, FaListOl, FaSearch, FaTrophy, FaUserTie } from 'react-icons/fa';
import { toast } from 'react-toastify';

const CandidateHiring = () => {
    const [jobDescription, setJobDescription] = useState('');
    const [topN, setTopN] = useState(10);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 50) {
            toast.warning("Maximum 50 files allowed at once.");
            return;
        }
        setFiles(selectedFiles);
    };

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!jobDescription.trim()) {
            toast.error("Please enter a Job Description.");
            return;
        }
        if (files.length === 0) {
            toast.error("Please upload at least one resume.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('jobDescription', jobDescription);
        formData.append('topN', topN);
        files.forEach(file => {
            formData.append('resumes', file);
        });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/cv/analyze`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data);
                toast.success(`Analysis complete! Processed ${data.totalProcessed} resumes.`);
            } else {
                const err = await response.json();
                toast.error(err.message || 'Analysis failed');
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error during analysis");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="space-y-6 pb-10 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Candidate <span className="text-cyan-500">Hiring</span> Analysis</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                        AI-Powered Bulk Resume Screening & Ranking
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Input Section */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#131619] p-6 rounded-[2px] border border-gray-800 shadow-xl">
                            <h2 className="text-white font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                                <span className="p-1.5 bg-cyan-500/10 text-cyan-500 rounded"><FaSearch /></span>
                                Job Details
                            </h2>

                            <form onSubmit={handleAnalyze} className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1 block">Job Description (JD)</label>
                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        placeholder="Paste the full job description here... (skills, responsibilities, requirements)"
                                        className="w-full h-40 bg-[#1a1f24] border border-gray-800 rounded-[2px] p-3 text-xs text-gray-300 focus:border-cyan-500 outline-none resize-none custom-scrollbar"
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1 block">Top Candidates</label>
                                        <div className="relative">
                                            <FaListOl className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={topN}
                                                onChange={(e) => setTopN(e.target.value)}
                                                className="w-full bg-[#1a1f24] border border-gray-800 rounded-[2px] py-2 pl-9 pr-3 text-white text-sm font-bold focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1 block">Upload Limit</label>
                                        <div className="py-2 px-3 bg-[#1a1f24] border border-gray-800 rounded-[2px] text-gray-500 text-xs font-bold text-center">
                                            Max 50 Files
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block w-full cursor-pointer group">
                                        <div className="w-full h-32 border-2 border-dashed border-gray-700 rounded-[2px] flex flex-col items-center justify-center gap-2 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/5 transition-all">
                                            <FaCloudUploadAlt className="text-3xl text-gray-600 group-hover:text-cyan-500 transition-colors" />
                                            <div className="text-center">
                                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider group-hover:text-gray-200">
                                                    {files.length > 0 ? `${files.length} Files Selected` : "Click to Upload Resumes"}
                                                </p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">PDF or DOCX only</p>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.doc"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-4 rounded-[2px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'}`}
                                >
                                    {loading ? (
                                        <>Processing...</>
                                    ) : (
                                        <><FaTrophy /> Find Top Talent</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="lg:col-span-2">
                        {results ? (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Analysis <span className="text-green-500">Results</span></h2>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#131619] px-3 py-1 rounded-[2px] border border-gray-800">
                                        Showing Top {results.topCandidates.length} Matches
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {results.topCandidates.map((candidate, index) => (
                                        <div key={index} className="bg-[#131619] border border-gray-800 rounded-[2px] p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                                            {/* Rank Badge */}
                                            <div className="absolute top-0 left-0 bg-gray-800 px-3 py-1 rounded-br-[4px] text-[10px] font-black text-white uppercase tracking-widest group-hover:bg-cyan-500 group-hover:text-black transition-colors z-10">
                                                Rank #{index + 1}
                                            </div>

                                            {/* Match Score Circle */}
                                            <div className="flex-shrink-0 flex items-center justify-center">
                                                <div className="w-20 h-20 rounded-full border-4 border-gray-800 flex flex-col items-center justify-center relative group-hover:border-cyan-500/20 transition-all">
                                                    <span className={`text-xl font-black ${candidate.score >= 70 ? 'text-green-500' : candidate.score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                        {candidate.score}%
                                                    </span>
                                                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Match</span>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                                                            {candidate.name}
                                                            {candidate.fileName.endsWith('.pdf') ? <FaFilePdf className="text-red-500 text-sm" /> : <FaFileWord className="text-blue-500 text-sm" />}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 font-mono mt-1">{candidate.fileName}</p>
                                                    </div>
                                                    <div className="text-right space-y-1">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{candidate.email !== "N/A" ? candidate.email : "Email Not Found"}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{candidate.phone !== "N/A" ? candidate.phone : "Phone Not Found"}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-[#1a1f24] p-3 rounded-[2px] border border-gray-800/50">
                                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">Matched Keywords</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {candidate.matchedKeywords.length > 0 ? (
                                                            candidate.matchedKeywords.map((kw, i) => (
                                                                <span key={i} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded-[2px] border border-cyan-500/20">
                                                                    {kw}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-600 text-xs italic">No specific keyword matches found</span>
                                                        )}
                                                        {candidate.matchCount > 10 && (
                                                            <span className="text-gray-500 text-[10px] font-bold self-center">+{candidate.matchCount - 10} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-[#131619] border border-gray-800 border-dashed rounded-[2px] opacity-50">
                                <FaUserTie className="text-6xl text-gray-700 mb-4" />
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Waiting for Analysis</p>
                                <p className="text-gray-600 text-xs mt-2">Upload resumes and define criteria to start</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CandidateHiring;
