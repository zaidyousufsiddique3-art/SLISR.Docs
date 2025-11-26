import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DocumentType, RequestStatus, DocRequest, Attachment } from '../types';
import { createRequest, generateRequestId } from '../firebase/requestService';
import { sendNotification } from '../firebase/notificationService';
import { getSuperAdmins } from '../firebase/userService';
import { uploadFile } from '../firebase/storage';
import { generateId } from '../services/mockDb';
import Button from '../components/Button';
import { ArrowLeft, Upload, File, X } from 'lucide-react';

const NewRequest: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<DocumentType>(DocumentType.ACADEMIC_REPORT);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const admissionNo = user.admissionNumber || 'UNKNOWN';
      // Use Firebase async generator
      const requestId = await generateRequestId(admissionNo);
      
      const attachments: Attachment[] = [];

      // Process optional file upload with Firebase Storage
      if (selectedFile) {
        const downloadUrl = await uploadFile(selectedFile, `requests/${requestId}/${selectedFile.name}`);
        attachments.push({
          id: generateId(),
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          dataUrl: downloadUrl,
          uploadedBy: `${user.firstName} ${user.lastName}`,
          status: 'Pending', // Student uploads are pending/reference
          createdAt: new Date().toISOString()
        });
      }

      const newReq: DocRequest = {
        id: requestId,
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        studentAdmissionNo: admissionNo,
        type: type,
        details: details,
        status: RequestStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        attachments: attachments
      };

      await createRequest(newReq);
      
      // Notify Super Admins
      const superAdmins = await getSuperAdmins();
      superAdmins.forEach(admin => {
          sendNotification(admin.id, `New request ${requestId} from ${newReq.studentName}`, `/requests/${requestId}`);
      });

      setLoading(false);
      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating request", error);
      setLoading(false);
      alert("Failed to create request. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Dashboard
      </button>

      <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200 dark:border-slate-700 p-10 transition-colors">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">New Document Request</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm leading-relaxed">Please provide the details for the document you require. Our administrative team will review your request shortly.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Document Type</label>
            <div className="relative">
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as DocumentType)}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white appearance-none"
              >
                {Object.values(DocumentType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Additional Details / Instructions</label>
            <textarea
              required
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please specify academic year, term, or any specific requirements..."
              className="w-full px-6 py-4 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Attach Document (Optional)</label>
            <div className="relative">
              {!selectedFile ? (
                 <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0f172a]/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Click to upload</span> (Single file)</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileSelect} />
                 </label>
              ) : (
                 <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-600 rounded-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700">
                           <File className="w-5 h-5 text-brand-500" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{selectedFile.name}</p>
                           <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setSelectedFile(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                 </div>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 ml-1">Uploaded documents cannot be edited after submission.</p>
          </div>

          <div className="pt-6 flex items-center justify-end space-x-4">
             <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Cancel</Button>
             <Button type="submit" isLoading={loading} className="shadow-lg shadow-brand-500/25">Submit Request</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRequest;