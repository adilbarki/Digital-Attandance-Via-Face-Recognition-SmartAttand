import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface AddClassProps {
  onSuccess: () => void;
}

const AddClass: React.FC<AddClassProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    class_name: '',
    section: '',
    subject: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/classes', formData);
      toast.success('Class added successfully!');
      setFormData({ class_name: '', section: '', subject: '' });
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Add New Class</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Class Name *</label>
          <input
            type="text"
            value={formData.class_name}
            onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="e.g., 10th Grade, BSCS"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Section *</label>
          <input
            type="text"
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="e.g., A, B, C"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Subject *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="e.g., Mathematics, Physics"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Class'}
        </button>
      </form>
    </div>
  );
};

export default AddClass;