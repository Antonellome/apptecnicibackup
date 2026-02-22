import { useState } from 'react';
import {
    GridToolbarContainer,
    GridToolbarColumnsButton,
    GridToolbarFilterButton,
    GridToolbarDensitySelector,
    GridCsvExportMenuItem,
    GridCsvExportOptions,
} from '@mui/x-data-grid';
import { Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface CustomGridToolbarProps {
    onOpenPrintModal: () => void;
    csvOptions: GridCsvExportOptions;
}

const CustomGridToolbar = (props: CustomGridToolbarProps) => {
    const { onOpenPrintModal, csvOptions } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handlePrint = () => {
        onOpenPrintModal();
        handleMenuClose();
    };

    const handlePdf = () => {
        onOpenPrintModal();
        handleMenuClose();
    };

    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            
            <Button
                id="export-button"
                aria-controls={open ? 'export-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleMenuClick}
                endIcon={<ArrowDropDownIcon />}
                size="small"
            >
                Esporta
            </Button>
            <Menu
                id="export-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'export-button',
                }}
            >
                <MenuItem onClick={handlePrint}>
                    <PrintIcon sx={{ mr: 1 }} />
                    Stampa
                </MenuItem>
                
                <MenuItem onClick={handlePdf}>
                    <PictureAsPdfIcon sx={{ mr: 1 }} />
                    Download PDF
                </MenuItem>

                {/* CIAO: Corretto onExport per allinearlo all'API di MUI */}
                <GridCsvExportMenuItem
                    options={csvOptions}
                />
            </Menu>
        </GridToolbarContainer>
    );
};

export default CustomGridToolbar;
