import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Ad } from "../types/ad";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import CloseIcon from "@mui/icons-material/Close";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from "@mui/material";

interface Props {
  ad: Ad;
  selected?: boolean;
  selectMode?: boolean;
  toggleSelect?: (id: string) => void;
}

export default function AdCard({
  ad,
  selected,
  selectMode,
  toggleSelect,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (!ref.current || selectMode) return;
    return draggable({
      element: ref.current,
      getInitialData: () => ({ libraryId: ad.library_id }),
    });
  }, [ad.library_id, selectMode]);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent interfering with drag or select
    setOpenModal(true);
  };

  const handleCloseModal = () => setOpenModal(false);

  return (
    <>
      <div
        ref={ref}
        className={`relative bg-white border shadow rounded p-2 text-sm transition-all 
        ${
          selectMode
            ? "cursor-pointer hover:ring"
            : "cursor-grab active:cursor-grabbing"
        } 
        ${selected ? "border-blue-500" : ""}`}
        onClick={() => selectMode && toggleSelect?.(ad.library_id)}
      >
        {selectMode && (
          <input
            type="checkbox"
            className="absolute top-2 left-2 z-10"
            checked={selected}
            onChange={() => toggleSelect?.(ad.library_id)}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Zoom icon button */}
        <IconButton
          onClick={handleOpenModal}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 20,
            backgroundColor: "white",
            boxShadow: 1,
            "&:hover": { backgroundColor: "#f1f1f1" },
          }}
        >
          <ZoomInIcon fontSize="small" />
        </IconButton>

        <Image
          src={ad.s3_key}
          alt="Ad"
          width={500}
          height={500}
          className="w-full object-cover rounded"
          draggable={false}
          quality={100}
        />
      </div>

      {/* Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleCloseModal}
            aria-label="close"
            style={{ position: "absolute", top: 10, right: 20 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Image
            src={ad.s3_key}
            alt="Ad Full"
            width={600}
            height={600}
            className="w-full p-12 object-contain"
            quality={100}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
