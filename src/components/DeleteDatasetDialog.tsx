import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2 } from "lucide-react";

interface DeleteDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetName: string;
  onConfirmDelete: () => void;
}

const REQUIRED_PASSWORD = "Odysseus";

export function DeleteDatasetDialog({
  open,
  onOpenChange,
  datasetName,
  onConfirmDelete,
}: DeleteDatasetDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleDelete = () => {
    if (password === REQUIRED_PASSWORD) {
      onConfirmDelete();
      handleClose();
    } else {
      setError("Incorrect password");
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Delete Active Dataset
          </DialogTitle>
          <DialogDescription>
            You are about to delete the active dataset: <strong>{datasetName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">Warning</p>
              <p className="text-muted-foreground">
                This will permanently delete the dataset and all associated books. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Enter Host Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password to confirm"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleDelete();
                }
              }}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!password.trim()}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Dataset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
