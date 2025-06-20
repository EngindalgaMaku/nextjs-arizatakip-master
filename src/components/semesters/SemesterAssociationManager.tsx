'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTeachers } from '@/actions/teacherActions';
import { fetchClasses } from '@/actions/classActions';
import { fetchLocations } from '@/actions/locationActions';
import { fetchBranches } from '@/actions/branchActions';
import { 
  associateTeachersWithSemester,
  associateClassesWithSemester,
  associateLocationsWithSemester,
  fetchEntitiesBySemester
} from '@/actions/semesterAssociationActions';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray } from 'react-hook-form';

type EntityType = 'teachers' | 'classes' | 'locations';

// Define a base type for entities to help with useQuery typing
interface BaseEntity {
  id?: string; // Make id optional to align with Partial<Teacher>
  name?: string; // Common property, make it optional if not always present
  [key: string]: any; // Allow other properties
}

interface SemesterAssociationManagerProps {
  semesterId: string;
  type: EntityType;
  semesterName: string;
}

export function SemesterAssociationManager({ semesterId, type, semesterName }: SemesterAssociationManagerProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  
  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    enabled: type === 'locations' || type === 'teachers' // Fetch for locations OR teachers tab
  });
  
  // Set default branch to "Bilişim Teknolojileri" if it exists when branches are loaded
  useEffect(() => {
    // Apply default branch selection for both locations and teachers tabs
    if ((type === 'locations' || type === 'teachers') && branches.length > 0 && selectedBranchId === 'all') {
      const bilisimBranch = branches.find((branch) => 
        branch.name.toLowerCase().includes('bilişim') || 
        branch.name.toLowerCase().includes('bilisim')
      );
      
      if (bilisimBranch && typeof bilisimBranch.id === 'string') {
        setSelectedBranchId(bilisimBranch.id);
      }
    }
  }, [branches, type, selectedBranchId, setSelectedBranchId]);
  
  // Fetch the appropriate data based on the entity type
  const { data: entityData = [], isLoading } = useQuery<BaseEntity[], Error>({
    queryKey: [type, semesterId],
    queryFn: async () => { // Make queryFn async to handle mixed promise/non-promise returns properly
      switch (type) {
        case 'teachers':
          return fetchTeachers(undefined); // Returns Promise<Partial<Teacher>[]>
        case 'classes':
          return fetchClasses(undefined);  // Returns Promise<Class[]>
        case 'locations':
          return fetchLocations(undefined); // Returns Promise<LocationWithLabType[]>
        default:
          // Ensure a Promise is returned for the default case as well
          return Promise.resolve([]); 
      }
    }
  });
  
  // Fetch entities that are already associated with this semester
  const { data: associatedEntities = [] } = useQuery({
    queryKey: [`${type}BySemester`, semesterId],
    queryFn: async () => {
      const result = await fetchEntitiesBySemester(type, semesterId);
      return result.success ? result.data : [];
    }
  });
  
  // Initialize selected IDs based on already associated entities
  useEffect(() => {
    if (associatedEntities.length > 0) {
      const associatedIds = new Set(associatedEntities.map((entity) => entity.id));
      setSelectedIds(associatedIds);
    }
  }, [associatedEntities, setSelectedIds]);

  // Filter entities based on search term and selected branch
  const filteredEntities = entityData.filter((entity: any) => {
    // First filter by search term
    const matchesSearch = !searchTerm.trim() || 
      entity.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then filter by branch if a branch filter is active for the current type
    let matchesBranch = true; // Default to true (no filter applied)
    if (selectedBranchId !== 'all') {
      if (type === 'locations') {
        matchesBranch = entity.branch_id === selectedBranchId;
      } else if (type === 'teachers') {
        matchesBranch = entity.branchId === selectedBranchId; // Teachers use branchId
      }
    }
    
    return matchesSearch && matchesBranch;
  });

  // Mutation for saving associations
  const associateMutation = useMutation({
    mutationFn: () => {
      const idsArray = Array.from(selectedIds);
      switch (type) {
        case 'teachers':
          return associateTeachersWithSemester(semesterId, idsArray);
        case 'classes':
          return associateClassesWithSemester(semesterId, idsArray);
        case 'locations':
          return associateLocationsWithSemester(semesterId, idsArray);
        default:
          throw new Error(`Unsupported entity type: ${type}`);
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || `${getEntityLabel()} başarıyla sömestr ile ilişkilendirildi.`);
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: [type] });
        queryClient.invalidateQueries({ queryKey: [`${type}BySemester`, semesterId] });
        queryClient.invalidateQueries({ queryKey: ['semesters'] });
      } else {
        toast.error(data.error || 'İlişkilendirme başarısız.');
      }
    },
    onError: (error) => {
      toast.error(`İlişkilendirme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  });

  // Helper function to get appropriate labels based on entity type
  const getEntityLabel = () => {
    switch (type) {
      case 'teachers': return 'Öğretmenler';
      case 'classes': return 'Sınıflar';
      case 'locations': return 'Konumlar';
      default: return 'Öğeler';
    }
  };

  // Toggle selection of an entity
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Handle "select all" functionality
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntities.length) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all visible items
      const newSelection = new Set<string>();
      filteredEntities.forEach((entity: any) => {
        newSelection.add(entity.id);
      });
      setSelectedIds(newSelection);
    }
  };

  // Handle save button click
  const handleSave = () => {
    if (selectedIds.size === 0) {
      toast.warning('Lütfen en az bir öğe seçin.');
      return;
    }
    associateMutation.mutate();
  };

  // Helper function to get branch name from ID
  const getBranchName = (branchId: string) => {
    const branch = branches.find((b: any) => b.id === branchId);
    return branch ? branch.name : 'Bilinmeyen Branş';
  };

  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {getEntityLabel()} - {semesterName}
        </CardTitle>
        <CardDescription>
          Bu sayfada {getEntityLabel().toLowerCase()} ve {semesterName} sömestr arasında ilişki kurabilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              className="w-64"
              placeholder={`${getEntityLabel()} ara...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {/* Branş filtresi - locations ve teachers için göster */}
            {(type === 'locations' || type === 'teachers') && (
              <div className="w-64">
                <Select 
                  value={selectedBranchId} 
                  onValueChange={(value) => setSelectedBranchId(value || 'all')} // Ensure 'all' if value is null/undefined
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Branşa göre filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Branşlar</SelectItem>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} {branch.type === 'meslek' ? '(Meslek)' : '(Kültür)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            onClick={toggleSelectAll}
            disabled={isLoading || filteredEntities.length === 0}
          >
            {selectedIds.size === filteredEntities.length && filteredEntities.length > 0
              ? 'Tümünü Kaldır'
              : 'Tümünü Seç'}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Yükleniyor...</div>
        ) : filteredEntities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || selectedBranchId !== 'all' ? 'Filtrelere uygun sonuç bulunamadı.' : `Henüz ${getEntityLabel().toLowerCase()} bulunamadı.`}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.size === filteredEntities.length && filteredEntities.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Adı</TableHead>
                  {type === 'teachers' && <TableHead>Branş</TableHead>}
                  {type === 'classes' && <TableHead>Seviye</TableHead>}
                  {type === 'locations' && (
                    <>
                      <TableHead>Tür</TableHead>
                      <TableHead>Branş</TableHead>
                    </>
                  )}
                  <TableHead>Durum</TableHead>
                  <TableHead>Sömestr Durumu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities.map((entity: any) => (
                  <TableRow key={entity.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(entity.id)}
                        onCheckedChange={() => toggleSelection(entity.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    {type === 'teachers' && <TableCell>{getBranchName(entity.branchId) || '-'}</TableCell>}
                    {type === 'classes' && <TableCell>{entity.grade_level || '-'}</TableCell>}
                    {type === 'locations' && (
                      <>
                        <TableCell>{entity.lab_type_name || entity.labType?.name || '-'}</TableCell>
                        <TableCell>{entity.branch?.name || getBranchName(entity.branch_id) || '-'}</TableCell>
                      </>
                    )}
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entity.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {entity.is_active !== false ? 'Aktif' : 'Pasif'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entity.semester_id === semesterId ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {entity.semester_id === semesterId ? 'Bu sömestr ile ilişkili' : 'İlişkili değil'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <span className="text-sm text-gray-600">
            {selectedIds.size} öğe seçildi ({filteredEntities.length} gösteriliyor)
          </span>
        </div>
        <Button 
          onClick={handleSave}
          disabled={associateMutation.isPending || isLoading}
        >
          {associateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </CardFooter>
    </Card>
  );
} 