import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface AddStudentProps {
  onSuccess: () => void;
}

const AddStudent: React.FC<AddStudentProps> = ({ onSuccess }) => {
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roll_number: '',
    university_roll_no: '',
    class_id: '',
    mobile_number: '',
    father_mobile: ''
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data);
    } catch (error) {
      toast.error('Failed to fetch classes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      toast.error('Please select a photo');
      return;
    }

    setLoading(true);

    const formDataObj = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataObj.append(key, value);
    });
    formDataObj.append('photo', photo);

    try {
      const response = await api.post('/students', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Student added! Default password: ${response.data.default_password}`);
      setFormData({
        name: '',
        email: '',
        roll_number: '',
        university_roll_no: '',
        class_id: '',
        mobile_number: '',
        father_mobile: ''
      });
      setPhoto(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Add New Student</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Roll Number *</label>
            <input
              type="text"
              value={formData.roll_number}
              onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">University Roll No *</label>
            <input
              type="text"
              value={formData.university_roll_no}
              onChange={(e) => setFormData({ ...formData, university_roll_no: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Class *</label>
            <select
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select Class</option>
              {classes.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name} - {cls.section} ({cls.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Mobile Number *</label>
            <input
              type="tel"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Father's Mobile *</label>
            <input
              type="tel"
              value={formData.father_mobile}
              onChange={(e) => setFormData({ ...formData, father_mobile: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Student Photo *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? 'Adding Student...' : 'Add Student'}
        </button>
      </form>
    </div>
  );
};

export default AddStudent;