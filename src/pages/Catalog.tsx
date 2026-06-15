import { useState, useMemo } from "react";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDevices } from "@/hooks/useDevices";
import { useServices } from "@/hooks/useServices";
import { ProductCard } from "@/components/Catalog/ProductCard";
import { AddProductDialog } from "@/components/Catalog/AddProductDialog";
import { EditDeviceDialog } from "@/components/Catalog/EditDeviceDialog";
import { DeleteDeviceDialog } from "@/components/Catalog/DeleteDeviceDialog";
import { ServiceCard } from "@/components/Catalog/ServiceCard";
import { AddServiceDialog } from "@/components/Catalog/AddServiceDialog";
import { EditServiceDialog } from "@/components/Catalog/EditServiceDialog";
import type { Device, Service } from "@/types/project";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Catalog = () => {
  const {
    devices,
    categories,
    loading: loadingDevices,
    addDevice,
    updateDevice,
    deleteDevice,
    addCategory,
  } = useDevices();

  const { services, loading: loadingServices, addService, updateService, deleteService } = useServices();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  // Product dialog state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

  // Service dialog state
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesSearch =
        !searchQuery ||
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.model?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || device.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [devices, searchQuery, selectedCategory]);

  const filteredServices = useMemo(() => {
    return services.filter(
      (s) =>
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const categoriesWithCounts = useMemo(() => {
    const counts = devices.reduce((acc, device) => {
      if (device.category_id) acc[device.category_id] = (acc[device.category_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return categories.map((cat) => ({ ...cat, count: counts[cat.id] || 0 }));
  }, [categories, devices]);

  const loading = activeTab === "products" ? loadingDevices : loadingServices;

  if (loading && (activeTab === "products" ? devices.length === 0 : services.length === 0)) {
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
        {activeTab === "products" ? (
          <Button
            onClick={() => setIsAddProductOpen(true)}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        ) : (
          <Button
            onClick={() => setIsAddServiceOpen(true)}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === "products" ? "Buscar produtos..." : "Buscar serviços..."}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {activeTab === "products" && (
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(""); }}>
        <TabsList>
          <TabsTrigger value="products">
            Produtos
            <Badge variant="secondary" className="ml-2">{devices.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="services">
            Serviços
            <Badge variant="secondary" className="ml-2">{services.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4 mt-4">
          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              className="whitespace-nowrap"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
              <Badge variant="secondary" className="ml-2">{devices.length}</Badge>
            </Button>
            {categoriesWithCounts.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                className="whitespace-nowrap"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
                <Badge variant="secondary" className="ml-2">{category.count}</Badge>
              </Button>
            ))}
          </div>

          {filteredDevices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory
                  ? "Nenhum produto encontrado com os filtros aplicados."
                  : "Nenhum produto cadastrado ainda."}
              </p>
              <Button onClick={() => setIsAddProductOpen(true)}>
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
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-4">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Nenhum serviço encontrado."
                  : "Nenhum serviço cadastrado ainda."}
              </p>
              <Button onClick={() => setIsAddServiceOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Serviço
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={setEditingService}
                  onDelete={setDeletingService}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Dialogs */}
      <AddProductDialog
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
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

      {/* Service Dialogs */}
      <AddServiceDialog
        open={isAddServiceOpen}
        onOpenChange={setIsAddServiceOpen}
        onAddService={addService}
      />
      <EditServiceDialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        service={editingService}
        onUpdate={updateService}
      />
      <AlertDialog open={!!deletingService} onOpenChange={(open) => !open && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{deletingService?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingService) { deleteService(deletingService.id); setDeletingService(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Catalog;
