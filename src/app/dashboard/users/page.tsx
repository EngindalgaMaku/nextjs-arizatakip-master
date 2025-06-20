'use client';

import { deleteUser, getUsers, registerUser, updateUserProfile } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

interface UserData {
  id: number | string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

interface UserFormData {
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive';
}

export default function UsersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    role: 'viewer',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Kullanıcıları yükle
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      // Gerçek API çağrısı yap (production'da)
      const { data, error } = await getUsers();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // API'den gelen veriyi formata
        const formattedUsers = data.map((user: any) => ({
          id: user.id,
          email: user.email,
          role: user.role ?? 'viewer',
          status: user.status ?? 'active',
          lastLogin: user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : 'Hiç giriş yapmadı',
        }));
        setUsers(formattedUsers);
      } else {
        setUsers([]); // Mock veri kaldırıldı
      }
    } catch (err) {
      console.error('Kullanıcılar yüklenirken hata oluştu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtre based on search term, role, and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDeleteUser = async (userId: string | number) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) {
      return;
    }
    try {
      // Her iki tip için de silme işlemi uygula
      const { error } = await deleteUser(String(userId));
      if (error) throw error;
      // UI'dan kullanıcıyı kaldır (optimistic update)
      setUsers(users.filter(user => String(user.id) !== String(userId)));
    } catch (error) {
      console.error('Kullanıcı silinirken hata oluştu:', error);
      alert('Kullanıcı silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Girdi değiştiğinde hata mesajını temizle
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = "E-posta alanı zorunludur";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Geçerli bir e-posta adresi giriniz";
    }
    
    if (!isEditModalOpen && !formData.password.trim()) {
      errors.password = "Şifre alanı zorunludur";
    } else if (!isEditModalOpen && formData.password.length < 6) {
      errors.password = "Şifre en az 6 karakter olmalıdır";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = async () => {
    if (validateForm()) {
      setFormSubmitting(true);
      try {
        // Supabase ile kullanıcı kayıt işlemi
        const data = await registerUser(formData.email, formData.password, {
          role: formData.role,
          status: formData.status
        });

        if (data.user) {
          const newUser: UserData = {
            id: data.user.id,
            email: formData.email,
            role: formData.role,
            status: formData.status,
            lastLogin: 'Henüz giriş yapılmadı'
          };
          
          setUsers(prev => [...prev, newUser]);
          resetForm();
          setIsAddModalOpen(false);
        }
      } catch (error: unknown) {
        console.error('Kullanıcı eklenirken hata oluştu:', error);
        
        if (error instanceof Error && error.message.includes('email already taken')) {
          setFormErrors(prev => ({ ...prev, email: "Bu e-posta adresi zaten kullanılıyor" }));
        } else if (error instanceof Error) {
          alert(`Kullanıcı eklenirken bir hata oluştu: ${error.message}`);
        } else {
          alert('Kullanıcı eklenirken bir hata oluştu');
        }
      } finally {
        setFormSubmitting(false);
      }
    }
  };

  const handleEditUser = async () => {
    if (!currentUser || !validateForm()) return;
    
    try {
      setFormSubmitting(true);
      
      // Supabase ile kullanıcı güncelleme işlemi
      const { error } = await updateUserProfile(currentUser.id.toString(), {
        role: formData.role as 'admin' | 'editor' | 'viewer',
        status: formData.status
      });
      
      if (error) throw error;
      
      // UI'da kullanıcıyı güncelle
      setUsers(prev => prev.map(user => {
        if (user.id === currentUser.id) {
          return {
            ...user,
            role: formData.role,
            status: formData.status
          };
        }
        return user;
      }));
      
      resetForm();
      setIsEditModalOpen(false);
      setCurrentUser(null);
    } catch (error: unknown) {
      console.error('Kullanıcı güncellenirken hata oluştu:', error);
      if (error instanceof Error) {
        alert(`Kullanıcı güncellenirken bir hata oluştu: ${error.message}`);
      } else {
        alert('Kullanıcı güncellenirken bir hata oluştu');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (user: UserData) => {
    setCurrentUser(user);
    setFormData({
      email: user.email,
      password: '', // Düzenleme ekranında şifre alanını boş bırakıyoruz
      role: user.role as 'admin' | 'editor' | 'viewer',
      status: user.status
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'viewer',
      status: 'active'
    });
    setFormErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl font-semibold text-indigo-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen kullanıcı verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Kullanıcı Yönetimi</h1>
        <p className="mt-1 text-gray-500">Yönetici hesaplarını ve izinlerini yönetin</p>
      </div>
      
      {/* Filtreler ve Arama */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Kullanıcı ara
          </label>
          <input
            type="search"
            id="search"
            placeholder="İsim veya e-posta ile ara"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          <option value="all">Tüm Roller</option>
          <option value="admin">Yönetici</option>
          <option value="editor">Editör</option>
          <option value="viewer">Görüntüleyici</option>
        </select>

        <select
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>

        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => Swal.fire({
            title: 'Bilgi',
            text: 'Bu işlem güvenlik amaçlı buradan yapılamaz. Ana yöneticinize başvurun',
            icon: 'info',
            confirmButtonText: 'Tamam'
          })}
        >
          Kullanıcı Ekle
        </button>
      </div>
      
      {/* Kullanıcı Tablosu */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-posta
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                  Arama kriterlerinize uygun kullanıcı bulunamadı
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-700">{user.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      onClick={() => openEditModal(user)}
                    >
                      Düzenle
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Kullanıcı Ekleme Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Yeni Kullanıcı Ekle</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-posta</label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      />
                      {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">Şifre</label>
                      <input
                        type="password"
                        name="password"
                        id="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      />
                      {formErrors.password && <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>}
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
                      <select
                        name="role"
                        id="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="admin">Yönetici</option>
                        <option value="editor">Editör</option>
                        <option value="viewer">Görüntüleyici</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">Durum</label>
                      <select
                        name="status"
                        id="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddUser}
                  disabled={formSubmitting}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm ${formSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {formSubmitting ? 'Ekleniyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddModalOpen(false);
                  }}
                  disabled={formSubmitting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kullanıcı Düzenleme Modal */}
      {isEditModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Kullanıcıyı Düzenle: {currentUser.email}</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-posta</label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        disabled
                        className="mt-1 block w-full border border-gray-300 bg-gray-100 rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">E-posta adresi değiştirilemez</p>
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
                      <select
                        name="role"
                        id="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="admin">Yönetici</option>
                        <option value="editor">Editör</option>
                        <option value="viewer">Görüntüleyici</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">Durum</label>
                      <select
                        name="status"
                        id="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleEditUser}
                  disabled={formSubmitting}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm ${formSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {formSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsEditModalOpen(false);
                    setCurrentUser(null);
                  }}
                  disabled={formSubmitting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 