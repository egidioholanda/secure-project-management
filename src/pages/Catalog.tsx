import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Catalog = () => {
  const categories = [
    { name: "Todos", count: 42 },
    { name: "Câmeras", count: 15 },
    { name: "DVRs/NVRs", count: 8 },
    { name: "Controle de Acesso", count: 12 },
    { name: "Sensores", count: 7 },
  ];

  const products = [
    {
      id: "1",
      name: "Câmera IP Bullet 4MP",
      category: "Câmeras",
      manufacturer: "Hikvision",
      model: "DS-2CD2043G0-I",
      costPrice: "R$ 380,00",
      salePrice: "R$ 650,00",
      stock: 24,
      image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400",
    },
    {
      id: "2",
      name: "DVR 16 Canais Full HD",
      category: "DVRs/NVRs",
      manufacturer: "Intelbras",
      model: "MHDX 3116",
      costPrice: "R$ 680,00",
      salePrice: "R$ 1.180,00",
      stock: 12,
      image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400",
    },
    {
      id: "3",
      name: "Leitor Biométrico",
      category: "Controle de Acesso",
      manufacturer: "Control iD",
      model: "iDFlex Pro",
      costPrice: "R$ 890,00",
      salePrice: "R$ 1.450,00",
      stock: 8,
      image: "https://images.unsplash.com/photo-1614064745228-5b2e62bfb9e2?w=400",
    },
    {
      id: "4",
      name: "Sensor Infravermelho",
      category: "Sensores",
      manufacturer: "JFL",
      model: "IVP 8000",
      costPrice: "R$ 95,00",
      salePrice: "R$ 165,00",
      stock: 45,
      image: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=400",
    },
    {
      id: "5",
      name: "Câmera Speed Dome PTZ",
      category: "Câmeras",
      manufacturer: "Hikvision",
      model: "DS-2DE4A425IW-DE",
      costPrice: "R$ 2.850,00",
      salePrice: "R$ 4.200,00",
      stock: 5,
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400",
    },
    {
      id: "6",
      name: "Fechadura Eletroimã",
      category: "Controle de Acesso",
      manufacturer: "Intelbras",
      model: "FE 1000",
      costPrice: "R$ 280,00",
      salePrice: "R$ 480,00",
      stock: 18,
      image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Catálogo</h1>
          <p className="text-muted-foreground">Gerencie produtos e serviços</p>
        </div>
        <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." className="pl-10" />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category.name}
            variant={category.name === "Todos" ? "default" : "outline"}
            className="whitespace-nowrap"
          >
            {category.name}
            <Badge variant="secondary" className="ml-2">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-elegant transition-all duration-300 group cursor-pointer">
            <div className="aspect-video overflow-hidden bg-muted">
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <Badge variant="secondary" className="mb-2">{product.category}</Badge>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {product.manufacturer} - {product.model}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Preço de Venda</p>
                  <p className="text-lg font-bold text-success">{product.salePrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Estoque</p>
                  <p className="text-lg font-semibold">{product.stock}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Catalog;
