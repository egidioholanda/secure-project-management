import { useState, useMemo } from "react";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDevices } from "@/hooks/useDevices";
import { ProductCard } from "@/components/Catalog/ProductCard";
import { AddProductDialog } from "@/components/Catalog/AddProductDialog";
import { EditDeviceDialog } from "@/components/Catalog/EditDeviceDialog";
import { DeleteDeviceDialog } from "@/components/Catalog/DeleteDeviceDialog";
import type { Device } from "@/types/project";

const Catalog = () => {
  const {
    devices,
    categories,
    loading,
    addDevice,
    updateDevice,
    deleteDevice,
    addCategory,
  } = useDevices();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

  // Filter devices based on search and category
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesSearch =
        !searchQuery ||
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.model?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || device.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [devices, searchQuery, selectedCategory]);

  // Calculate category counts
  const categoriesWithCounts = useMemo(() => {
    const counts = devices.reduce((acc, device) => {
      if (device.category_id) {
        acc[device.category_id] = (acc[device.category_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return categories.map((cat) => ({
      ...cat,
      count: counts[cat.id] || 0,
    }));
  }, [categories, devices]);

  const totalCount = devices.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Catálogo</h1>
          <p className="text-muted-foreground">Gerencie produtos e serviços</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          className="whitespace-nowrap"
          onClick={() => setSelectedCategory(null)}
        >
          Todos
          <Badge variant="secondary" className="ml-2">
            {totalCount}
          </Badge>
        </Button>
        {categoriesWithCounts.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            className="whitespace-nowrap"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
            <Badge variant="secondary" className="ml-2">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredDevices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedCategory
              ? "Nenhum produto encontrado com os filtros aplicados."
              : "Nenhum produto cadastrado ainda."}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <ProductCard
              key={device.id}
              device={device}
              category={categories.find((c) => c.id === device.category_id)}
              onEdit={setEditingDevice}
              onDelete={setDeletingDevice}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categories={categories}
        onAddDevice={addDevice}
        onAddCategory={addCategory}
      />

      <EditDeviceDialog
        open={!!editingDevice}
        onOpenChange={(open) => !open && setEditingDevice(null)}
        device={editingDevice}
        categories={categories}
        onUpdate={updateDevice}
      />

      <DeleteDeviceDialog
        open={!!deletingDevice}
        onOpenChange={(open) => !open && setDeletingDevice(null)}
        device={deletingDevice}
        onDelete={deleteDevice}
      />
    </div>
  );
};

export default Catalog;
