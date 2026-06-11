import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, XCircle } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

const PendingApproval = () => {
  const { signOut, profile, refreshUserData } = useAuthContext();
  const isRejected = profile?.approval_status === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isRejected ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : (
              <Clock className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isRejected ? 'Cadastro não aprovado' : 'Aguardando aprovação'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {isRejected ? (
            <>
              <p className="text-muted-foreground">
                Seu cadastro foi recusado por um administrador.
              </p>
              {profile?.rejection_reason && (
                <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                  {profile.rejection_reason}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Sua conta foi criada com sucesso! Um administrador precisa aprovar
              seu acesso antes que você possa entrar no sistema. Você será
              notificado assim que isso acontecer.
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={refreshUserData}>
              Verificar novamente
            </Button>
            <Button variant="ghost" onClick={() => signOut()} className="gap-2">
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
