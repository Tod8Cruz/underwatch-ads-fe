import { useState, useEffect, useMemo, useRef } from "react";
import { GetServerSideProps } from "next";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  // Slider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import IconButton from "@mui/material/IconButton";

import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";

import AdCard from "../components/AdCard";
import DropZone from "../components/DropZone";
import { Ad } from "../types/ad";
import { fetchAdsFromSheet } from "../fetcher/googleSheets";
import dayjs, { Dayjs } from "dayjs";

interface Props {
  ads: Ad[];
}

const SEPARATOR = "|||";
export default function Home({ ads: initialAds }: Props) {
  const [ads, setAds] = useState<Ad[]>(initialAds);
  const [selectMode] = useState(false);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Date filters
  const today = dayjs();
  const thirtyDaysAgo = today.subtract(30, "day");
  const [startDate, setStartDate] = useState<Dayjs | null>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<Dayjs | null>(today);

  // Brand/site list for filter dropdown
  const sortedSites = useMemo(
    () =>
      Array.from(new Set(ads.map((ad) => ad.brand)))
        .filter((site) => site !== "") // Remove the empty string from the sortedSites
        .sort((a, b) => a.localeCompare(b, "ko-KR", { sensitivity: "base" })),
    [ads]
  );

  const [selectedSite, setSelectedSite] = useState<string>("");
  const [searchLibraryId, setSearchLibraryId] = useState<string>("");
  
  useEffect(() => {
    if (sortedSites.length > 0 && !selectedSite) {
      console.log("Setting default brand to:", sortedSites[0]);
      setSelectedSite(sortedSites[0]); // Set default to the first brand
    }
  }, [sortedSites, selectedSite]);

  const [openModal, setOpenModal] = useState(false);
  const [openRenameModal, setOpenRenameModal] = useState(false);

  const [groupName, setGroupName] = useState("");

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handleGroupNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setGroupName(event.target.value);
  };

  const handleCreateGroup = () => {
    if (!groupName) {
      alert("Please enter a group name.");
      return;
    }

    const newGroupId = `${selectedSite}${SEPARATOR}${uuidv4()}${SEPARATOR}${groupName}`;
    console.log("Creating group with ID:", newGroupId);
    setGroups((prevGroups) => [...prevGroups, newGroupId]);
    setGroupBrandMap((prevMap) => ({ ...prevMap, [newGroupId]: selectedSite }));

    setAds((prevAds) =>
      prevAds.map((ad) =>
        selectedAds.has(ad.library_id) ? { ...ad, group: newGroupId } : ad
      )
    );

    setSelectedAds(new Set());
    setGroupName("");
    setHasUnsavedChanges(true);

    handleCloseModal();
  };
  const [groupBeingEdited, setGroupBeingEdited] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState<string>(""); // For editing the name

  const handleOpenRenameModal = (groupId: string, currentGroupName: string) => {
    setGroupBeingEdited(groupId);
    setNewGroupName(currentGroupName);
    setOpenRenameModal(true); // Open the modal to rename the group
  };

  const handleCloseRenameModal = () => {
    setOpenRenameModal(false);
    setNewGroupName("");
    setGroupBeingEdited(null);
  };

  const handleRenameGroup = () => {
    if (!newGroupName) {
      alert("Please enter a group name.");
      return;
    }

    // Create the new group ID with the updated group name
    const newGroupId = `${groupBeingEdited
      ?.split(SEPARATOR)
      .slice(0, -1)
      .join(SEPARATOR)}${SEPARATOR}${newGroupName}`;

    // Update the group name in the groups and groupBrandMap state
    setGroups((prevGroups) =>
      prevGroups.map((groupId) =>
        groupId === groupBeingEdited ? newGroupId : groupId
      )
    );

    setGroupBrandMap((prevMap) => {
      const updatedMap = { ...prevMap };
      updatedMap[newGroupId] = prevMap[groupBeingEdited!]; // Use the old group ID's brand name
      delete updatedMap[groupBeingEdited!]; // Remove the old group ID mapping
      return updatedMap;
    });

    // Update the ads that belong to this group with the new group name
    setAds((prevAds) =>
      prevAds.map((ad) =>
        ad.group === groupBeingEdited
          ? { ...ad, group: newGroupId } // Update the ad's group ID with the new group ID
          : ad
      )
    );

    setHasUnsavedChanges(true); // Mark the changes as unsaved

    handleCloseRenameModal(); // Close the modal after renaming
  };

  // Apply filters
  const filteredBySite = selectedSite
    ? ads.filter((a) => a.brand === selectedSite)
    : ads;
  
  const filteredByLibraryId = searchLibraryId
    ? filteredBySite.filter((ad) => 
        ad.library_id.toLowerCase().includes(searchLibraryId.toLowerCase())
      )
    : filteredBySite;
    
  const filteredAds = filteredByLibraryId.filter((ad) => {
    const date = dayjs(ad.start_date);
    return (
      (!startDate || date.isAfter(startDate)) &&
      (!endDate || date.isBefore(endDate))
    );
  });

  const totalAdsInRange = filteredAds.reduce((sum, ad) => {
    const count = Number(ad.ads_count);
    return sum + (isNaN(count) ? 0 : count);
  }, 0);
  const groupsContainerRef = useRef<HTMLDivElement | null>(null);

  // Handle grouping logic
  const ungrouped = filteredAds.filter((ad) => !ad.group);
  const groupedMap: Record<string, Ad[]> = {};
  filteredAds.forEach((ad) => {
    if (ad.group) {
      groupedMap[ad.group] = groupedMap[ad.group] || [];
      groupedMap[ad.group].push(ad);
    }
  });

  // Move an individual ad between groups
  const handleMoveAd = (libraryId: string, destId: string) => {
    setAds((prev) =>
      prev.map((ad) =>
        ad.library_id === libraryId
          ? { ...ad, group: destId === "ungrouped" ? undefined : destId }
          : ad
      )
    );
    setHasUnsavedChanges(true);
  };

  // Save changes to the server
  const handleSave = async () => {
    const groupsToUpdate = ads.map((ad) => ad.group || "");
    const res = await fetch("/api/save-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: groupsToUpdate }),
    });
    if (res.ok) {
      toast.success("Changes saved!");
    } else {
      toast.error("Failed to save.");
    }
    setHasUnsavedChanges(false);
  };

  // Function to remove group with confirmation
  const handleRemoveGroup = (groupId: string) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete this group? All ads in this group will be moved to the ungrouped section.`
    );
    if (isConfirmed) {
      setGroups((prevGroups) =>
        prevGroups.filter((group) => group !== groupId)
      );

      setGroupBrandMap((prevMap) => {
        const updatedMap = { ...prevMap };
        delete updatedMap[groupId];
        return updatedMap;
      });

      setAds((prevAds) =>
        prevAds.map((ad) =>
          ad.group === groupId ? { ...ad, group: undefined } : ad
        )
      );

      setHasUnsavedChanges(true);
    }
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Initialize state for groups (group names) and group-brand mapping
  const [groups, setGroups] = useState<string[]>(() => {
    const existingGroups = new Set<string>();
    initialAds.forEach((ad) => {
      if (ad.group && ad.group.trim()) {
        existingGroups.add(ad.group.trim());
      }
    });
    return Array.from(existingGroups);
  });

  // Maintain the mapping between groups and brands
  const [groupBrandMap, setGroupBrandMap] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      initialAds.forEach((ad) => {
        if (ad.group && ad.brand) {
          map[ad.group] = ad.brand;
        }
      });
      return map;
    }
  );

  // Scroll to the bottom when a new group is added
  useEffect(() => {
    if (groupsContainerRef.current) {
      // Ensure the scroll happens after DOM update
      setTimeout(() => {
        groupsContainerRef.current?.scrollTo({
          top: groupsContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100); // Delay slightly to ensure DOM is updated
    }
  }, [groups]); // Only run this effect when `groups` change
  // Filter groups based on the selected brand
  const filteredGroups = groups.filter(
    (groupId: string) => groupBrandMap[groupId] === selectedSite
  );

  return (
    <Box p={4} maxWidth="1200px" mx="auto">
      <ToastContainer />

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={4}
      >
        <h1>Ad Library</h1>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap" mb={4}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Brand</InputLabel>
          <Select
            value={selectedSite}
            label="Brand"
            onChange={(e) => setSelectedSite(e.target.value)}
          >
            {sortedSites.map((site) => (
              <MenuItem key={site} value={site}>
                {site}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Search Library ID"
          variant="outlined"
          value={searchLibraryId}
          onChange={(e) => setSearchLibraryId(e.target.value)}
          placeholder="Enter library ID to search..."
          sx={{ minWidth: 250 }}
        />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            format="YYYY-MM-DD"
          />
        </LocalizationProvider>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            format="YYYY-MM-DD"
          />
        </LocalizationProvider>

        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            setStartDate(thirtyDaysAgo);
            setEndDate(today);
            setSearchLibraryId("");
          }}
        >
          Clear All Filters
        </Button>
      </Box>

      <Box display="flex" justifyContent="space-between" mb={2}>
        <div className="text-md">
          {searchLibraryId ? (
            <>
              Search results for "<strong>{searchLibraryId}</strong>":{" "}
              <span className="text-blue-600">{filteredAds.length}</span> ads found
              {filteredAds.length !== totalAdsInRange && (
                <span className="text-gray-500 ml-2">
                  (out of {totalAdsInRange} total ads in date range)
                </span>
              )}
            </>
          ) : (
            <>
              Total ads (all groups) from{" "}
              <strong>{startDate?.toISOString().split("T")[0]}</strong> to{" "}
              <strong>{endDate?.toISOString().split("T")[0]}</strong>:{" "}
              {totalAdsInRange}
            </>
          )}
        </div>

        <Button
          variant="contained"
          color="secondary"
          onClick={handleOpenModal}
          sx={{ padding: "8px 16px" }}
        >
          + Add New Group
        </Button>
        <Dialog open={openModal} onClose={handleCloseModal}>
          <DialogTitle>Enter Group Name</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              type="text"
              fullWidth
              variant="outlined"
              value={groupName}
              onChange={handleGroupNameChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} color="primary">
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} color="primary">
              Create Group
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <Box display="flex" gap={4}>
        <Box
          flex={1}
          maxHeight="70vh"
          overflow="auto"
          position="sticky"
          top={0}
        >
          <DropZone
            zoneId="ungrouped"
            onItemDropped={handleMoveAd}
            className="bg-gray-100 p-4 rounded-xl"
          >
            <h2 className="mb-4">
              Ungrouped (
              {ungrouped.reduce((sum, ad) => {
                const count = Number(ad.ads_count);
                return sum + (isNaN(count) ? 0 : count);
              }, 0)}
              )
            </h2>
            <Box
              position="relative"
              display="grid"
              gridTemplateColumns="repeat(auto-fill,minmax(150px,1fr))"
              gap={2}
            >
              {ungrouped.map((ad) => (
                <>
                  <AdCard
                    key={ad.library_id}
                    ad={ad}
                    selected={selectedAds.has(ad.library_id)}
                    selectMode={selectMode}
                  />
                </>
              ))}
            </Box>
          </DropZone>
        </Box>

        <Box
          flex={1}
          maxHeight="70vh"
          overflow="auto"
          className="flex flex-col gap-4"
          ref={groupsContainerRef}
        >
          {filteredGroups.map((groupId) => {
            const groupAds = groupedMap[groupId] || [];
            const totalAdsInGroup = groupAds.reduce((sum, ad) => {
              const count = Number(ad.ads_count);
              return sum + (isNaN(count) ? 0 : count);
            }, 0);

            const groupName = groupId.split(SEPARATOR).pop(); // gets the group name

            return (
              <DropZone
                key={groupId}
                zoneId={groupId}
                onItemDropped={handleMoveAd}
                className="bg-gray-100 p-4 rounded-xl mb-2"
                style={{ minHeight: groupAds.length === 0 ? "150px" : "auto" }} // Add min-height if group is empty
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 flex-row text-gray-600 text-sm">
                      <div className="font-bold text-black text-lg">
                        {groupName}
                      </div>
                      <IconButton
                        color="inherit"
                        size="small"
                        onClick={() =>
                          handleOpenRenameModal(groupId, groupName || "")
                        }
                      >
                        <EditIcon />
                      </IconButton>
                    </div>
                    <div>
                      Total{" "}
                      <span className="text-blue-500">{totalAdsInGroup}</span>{" "}
                      ads in this group
                    </div>
                  </div>

                  <Dialog
                    open={openRenameModal}
                    onClose={handleCloseRenameModal}
                  >
                    <DialogTitle>Rename Group</DialogTitle>
                    <DialogContent>
                      <TextField
                        autoFocus
                        margin="dense"
                        label="New Group Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleCloseRenameModal} color="primary">
                        Cancel
                      </Button>
                      <Button onClick={handleRenameGroup} color="primary">
                        Rename Group
                      </Button>
                    </DialogActions>
                  </Dialog>

                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleRemoveGroup(groupId)}
                  >
                    Delete Group
                  </Button>
                </div>

                {groupAds.length === 0 ? (
                  <div className="flex items-center justify-center text-gray-500 p-4">
                    Drag and drop here to make a group
                  </div>
                ) : (
                  <Box
                    display="grid"
                    gridTemplateColumns="repeat(auto-fill,minmax(150px,1fr))"
                    gap={2}
                  >
                    {groupAds.map((ad) => (
                      <AdCard
                        key={ad.library_id}
                        ad={ad}
                        selected={selectedAds.has(ad.library_id)}
                        selectMode={selectMode}
                      />
                    ))}
                  </Box>
                )}
              </DropZone>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const ads = await fetchAdsFromSheet();
  return { props: { ads } };
};
