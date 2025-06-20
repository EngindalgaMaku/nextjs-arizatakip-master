'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Device, DeviceFormData, deviceTypes, getDeviceTypeLabel } from '@/types/devices';
import { Location } from '@/types/locations'; // Needed for location dropdown
import { fetchDevices, createDevice, updateDevice, deleteDevice, moveDevice } from '@/actions/deviceActions';
import { fetchLocations } from '@/actions/locationActions'; // Fetch locations for the form
import DeviceForm from '@/components/devices/DeviceForm';
import DevicesTable from '@/components/devices/DevicesTable';
import DeviceQRCodeModal from '@/components/devices/DeviceQRCodeModal'; // Import QR Code Modal
import DevicePropertiesModal from '@/components/devices/DevicePropertiesModal'; // Import Properties Modal
import DeviceIssuesModal from '@/components/devices/DeviceIssuesModal'; // Import Issues Modal
import DeviceAddIssueModal from '@/components/devices/DeviceAddIssueModal'; // Import Add Issue Modal
import Swal from 'sweetalert2';
import { PlusIcon, PrinterIcon, MagnifyingGlassIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; // Add icons and pagination icons

// Import departments list (assuming it's exported from location types or a constants file)
// If not exported, we need to define it here or import from where it is defined.
// Example: import { departments } from '@/types/locations'; 
// For now, let's redefine it here based on the previous update:
const departments = [
  { value: 'bilisim', label: 'Bilişim Teknolojileri' },
  { value: 'muhasebe', label: 'Muhasebe' },
  { value: 'halkla_iliskiler', label: 'Halkla İlişkiler' },
  { value: 'gazetecilik', label: 'Gazetecilik' },
  { value: 'radyo_tv', label: 'Radyo ve Televizyon' },
  { value: 'plastik_sanatlar', label: 'Plastik Sanatlar' },
  { value: 'idare', label: 'İdare' },
  { value: 'diger', label: 'Diğer' },
];

// Placeholder for Location data used in form select
// No longer needed, we'll use the full Location object
// type LocationSelectItem = Pick<Location, 'id' | 'name'>;

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]); // Use Device type
  // Change state to hold full Location objects
  const [locations, setLocations] = useState<Location[]>([]); // For form dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For create/update form
  const [isProcessing, setIsProcessing] = useState(false); // For delete action
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null); // Use Device type
  const [isQrModalOpen, setIsQrModalOpen] = useState(false); // State for QR modal
  const [qrCodeDevice, setQrCodeDevice] = useState<Device | null>(null); // State for QR device
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [viewingPropertiesDevice, setViewingPropertiesDevice] = useState<Device | null>(null);
  const [isIssuesModalOpen, setIsIssuesModalOpen] = useState(false);
  const [viewingIssuesDevice, setViewingIssuesDevice] = useState<Device | null>(null);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);
  const [viewingAddIssueDevice, setViewingAddIssueDevice] = useState<Device | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [isMoving, setIsMoving] = useState(false); // State for move operation
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch both devices and locations
  const loadInitialData = useCallback(async () => {
    // Use initial loading state logic
    if (!devices.length) setIsLoading(true);
    setError(null);
    try {
      const [devicesData, locationsData] = await Promise.all([
        fetchDevices(), 
        fetchLocations() // fetchLocations should return Location[] including department
      ]);

      setDevices(devicesData);
      // Store the full locations data
      setLocations(locationsData);

    } catch (err) {
      console.error('Failed to load devices or locations:', err);
      setError(err instanceof Error ? err.message : 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  // Depend on devices.length or adjust as needed
  }, [devices.length]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filter and search devices
  const filteredDevices = devices
    .filter(device => {
      // Apply all filters
      return (
        // Filter by search term (case insensitive)
        (searchTerm === '' || 
          device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (device.serial_number && device.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
          // Include location name in search
          (device.location?.name && device.location.name.toLowerCase().includes(searchTerm.toLowerCase()))
        ) &&
        // Filter by device type
        (filterType === '' || device.type === filterType) &&
        // Filter by status
        (filterStatus === '' || device.status === filterStatus) &&
        // Filter by location
        (filterLocation === '' || device.location_id === filterLocation)
      );
    });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDevices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus, filterLocation]);

  // Get unique statuses for filter dropdown - filter out null and undefined values
  const uniqueStatuses = Array.from(
    new Set(
      devices
        .map(device => device.status)
        .filter((status): status is string => Boolean(status))
    )
  );

  // --- Handlers ---

  const handleCreateDevice = async (formData: DeviceFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createDevice(formData);
      if (result.success && result.device) {
        await loadInitialData();
        setIsCreateModalOpen(false);
        Swal.fire('Başarılı!', 'Cihaz başarıyla oluşturuldu.', 'success');
      } else {
        throw new Error(result.error || 'Cihaz oluşturulamadı.');
      }
    } catch (err) {
       console.error('Failed to create device:', err);
       const errorMsg = err instanceof Error ? err.message : 'Cihaz oluşturulurken bir hata oluştu.';
       Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (device: Device) => {
    setEditingDevice(device);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDevice(null);
  };

  const handleUpdateDevice = async (formData: DeviceFormData) => {
    if (!editingDevice) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateDevice(editingDevice.id, formData);
      if (result.success && result.device) {
        await loadInitialData();
        handleCloseEditModal();
        Swal.fire('Başarılı!', 'Cihaz başarıyla güncellendi.', 'success');
      } else {
        throw new Error(result.error || 'Cihaz güncellenemedi.');
      }
    } catch (err) {
      console.error('Failed to update device:', err);
      const errorMsg = err instanceof Error ? err.message : 'Cihaz güncellenirken bir hata oluştu.';
      Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    const confirmation = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu cihazı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, sil!',
        cancelButtonText: 'İptal'
      });

    if (!confirmation.isConfirmed) {
        return;
    }

    setIsProcessing(true); // Use isProcessing for delete
    setError(null);
    try {
      const deleteResult = await deleteDevice(deviceId);
      if (deleteResult.success) {
        await loadInitialData();
        Swal.fire('Silindi!', 'Cihaz başarıyla silindi.', 'success');
      } else {
        throw new Error(deleteResult.error || 'Cihaz silinemedi.');
      }
    } catch (err) {
      console.error('Failed to delete device:', err);
      const errorMsg = err instanceof Error ? err.message : 'Cihaz silinirken bir hata oluştu.';
      setError(errorMsg);
      Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewQrCode = (device: Device) => {
    if (device.barcode_value) {
      setQrCodeDevice(device);
      setIsQrModalOpen(true);
    } else {
      Swal.fire('Hata', 'Bu cihaz için henüz bir barkod değeri atanmamış.', 'warning');
    }
  };

  const handleViewProperties = (device: Device) => {
    setViewingPropertiesDevice(device);
    setIsPropertiesModalOpen(true);
  };

  const handleViewIssues = (device: Device) => {
    setViewingIssuesDevice(device);
    setIsIssuesModalOpen(true);
  };

  const handleAddIssue = (device: Device) => {
    setViewingAddIssueDevice(device);
    setIsAddIssueModalOpen(true);
  };

  const handleOpenPrintView = () => {
    window.open('/dashboard/devices/print', '_blank');
  };

  // Handler for moving devices up/down
  const handleMoveDevice = async (deviceId: string, direction: 'up' | 'down') => {
    setIsMoving(true);
    setError(null);
    try {
      const result = await moveDevice(deviceId, direction);
      if (result.success) {
        // Re-fetch to show the new order
        await loadInitialData();
        // No success message needed, UI update is enough
      } else {
        throw new Error(result.error || 'Cihaz taşınamadı.');
      }
    } catch (err) {
      console.error('Failed to move device:', err);
      const errorMsg = err instanceof Error ? err.message : 'Cihaz taşınırken bir hata oluştu.';
      setError(errorMsg);
      Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsMoving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Yükleniyor...</div>;
  }

  if (error && devices.length === 0) {
    return <div className="p-4 text-center text-red-500">Hata: {error}</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Cihaz Yönetimi</h1>
      <p className="mt-1 text-sm text-gray-500">
        Okuldaki bilgisayarları, yazıcıları ve diğer cihazları yönetin.
      </p>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">Hata: {error}</div>}

      {/* Search and Filter Section */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Cihaz Ara..."
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Tüm Tipler</option>
              {deviceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Tüm Durumlar</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Tüm Konumlar</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Stats */}
        <div className="mt-2 text-sm text-gray-500">
          Toplam {devices.length} cihaz, gösterilen: {filteredDevices.length}
          {(searchTerm || filterType || filterStatus || filterLocation) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterType('');
                setFilterStatus('');
                setFilterLocation('');
              }}
              className="ml-2 text-indigo-600 hover:text-indigo-800"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {/* Print All Button */}
        <button
          type="button"
          onClick={handleOpenPrintView}
          disabled={devices.length === 0} // Disable if no devices
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <PrinterIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Tüm Barkodları Yazdır
        </button>
        {/* Add New Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Yeni Cihaz Ekle
        </button>
      </div>

      {/* --- Devices Table --- */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
         <DevicesTable
            devices={currentItems}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteDevice}
            onViewQrCode={handleViewQrCode}
            onViewProperties={handleViewProperties}
            onViewIssues={handleViewIssues}
            onAddIssue={handleAddIssue}
            onMove={handleMoveDevice}
            isLoading={isProcessing || isMoving}
         />
         
         {/* Pagination Controls */}
         {filteredDevices.length > 0 && (
           <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
             <div className="flex-1 flex justify-between sm:hidden">
               <button
                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                 disabled={currentPage === 1}
                 className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
               >
                 Önceki
               </button>
               <button
                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                 disabled={currentPage === totalPages}
                 className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
               >
                 Sonraki
               </button>
             </div>
             <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
               <div>
                 <p className="text-sm text-gray-700">
                   <span className="font-medium">{indexOfFirstItem + 1}</span>
                   {" - "}
                   <span className="font-medium">
                     {Math.min(indexOfLastItem, filteredDevices.length)}
                   </span>
                   {" / "}
                   <span className="font-medium">{filteredDevices.length}</span>
                   {" sonuç"}
                 </p>
               </div>
               <div>
                 <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                   {/* Previous Page Button */}
                   <button
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                     disabled={currentPage === 1}
                     className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                   >
                     <span className="sr-only">Önceki</span>
                     <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                   </button>
                   
                   {/* Page Number Buttons */}
                   {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                     // For simplicity, show up to 5 pages centered around current page
                     const pageNum = Math.max(
                       1,
                       Math.min(
                         currentPage - Math.floor(Math.min(5, totalPages) / 2) + i,
                         totalPages - Math.min(5, totalPages) + 1
                       )
                     ) + i;
                     
                     // Ensure page numbers don't exceed totalPages
                     if (pageNum <= totalPages) {
                       return (
                         <button
                           key={pageNum}
                           onClick={() => setCurrentPage(pageNum)}
                           className={`relative inline-flex items-center px-4 py-2 border ${
                             pageNum === currentPage
                               ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                               : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                           } text-sm font-medium`}
                         >
                           {pageNum}
                         </button>
                       );
                     }
                     return null;
                   })}
                   
                   {/* Next Page Button */}
                   <button
                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                     disabled={currentPage === totalPages}
                     className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                   >
                     <span className="sr-only">Sonraki</span>
                     <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                   </button>
                 </nav>
               </div>
             </div>
           </div>
         )}
      </div>
      
      {/* Per Page Selector */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-2">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600">Sayfa başına:</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset to first page
            }}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Create Device Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
             <h2 className="text-lg font-medium mb-4">Yeni Cihaz Oluştur</h2>
            <DeviceForm
              onSubmit={handleCreateDevice}
              onClose={() => setIsCreateModalOpen(false)}
              isSubmitting={isSubmitting}
              availableLocations={locations} // Pass full locations
              availableDepartments={departments} // Pass departments
            />
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {isEditModalOpen && editingDevice && (
         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
             <h2 className="text-lg font-medium mb-4">Cihaz Düzenle</h2>
            <DeviceForm
              initialData={editingDevice}
              onSubmit={handleUpdateDevice}
              onClose={handleCloseEditModal}
              isSubmitting={isSubmitting}
              availableLocations={locations} // Pass full locations
              availableDepartments={departments} // Pass departments
            />
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && qrCodeDevice && (
          <DeviceQRCodeModal
            device={qrCodeDevice}
            onClose={() => setIsQrModalOpen(false)}
          />
      )}

      {/* Properties Modal */}
      {isPropertiesModalOpen && viewingPropertiesDevice && (
        <DevicePropertiesModal
          device={viewingPropertiesDevice}
          onClose={() => setIsPropertiesModalOpen(false)}
        />
      )}

      {/* Issues Modal */}
      {isIssuesModalOpen && viewingIssuesDevice && (
        <DeviceIssuesModal
          device={viewingIssuesDevice}
          onClose={() => { setIsIssuesModalOpen(false); setViewingIssuesDevice(null); }}
        />
      )}

      {/* Add Issue Modal */}
      {isAddIssueModalOpen && viewingAddIssueDevice && (
        <DeviceAddIssueModal
          device={viewingAddIssueDevice}
          onClose={() => setIsAddIssueModalOpen(false)}
          onSuccess={() => { setIsAddIssueModalOpen(false); setViewingAddIssueDevice(null); loadInitialData(); }}
        />
      )}
    </div>
  );
}

// Helper CSS (or add to global CSS / tailwind.config.js)
/*
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fade-in-scale {
  animation: fadeInScale 0.2s ease-out forwards;
}
*/ 