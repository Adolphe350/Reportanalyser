// Dashboard specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Upload button functionality
    const uploadButton = document.querySelector('.btn-upload');
    if (uploadButton) {
        uploadButton.addEventListener('click', function() {
            // In a real application, this would open a file upload dialog
            alert('File upload functionality would open here.');
            // You could implement a modal or redirect to an upload page
        });
    }

    // Table row actions
    const viewButtons = document.querySelectorAll('.btn-view:not(.disabled)');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const reportName = this.closest('tr').cells[0].textContent;
            alert(`Viewing report: ${reportName}`);
            // In a real app, this would navigate to a report detail page
        });
    });

    const downloadButtons = document.querySelectorAll('.btn-download:not(.disabled)');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const reportName = this.closest('tr').cells[0].textContent;
            alert(`Downloading report: ${reportName}`);
            // In a real app, this would trigger a file download
        });
    });

    const deleteButtons = document.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const reportName = this.closest('tr').cells[0].textContent;
            if (confirm(`Are you sure you want to delete the report: ${reportName}?`)) {
                // In a real app, this would send a delete request to the server
                alert(`Report deleted: ${reportName}`);
                this.closest('tr').remove();
            }
        });
    });

    // Simulate data loading with a small delay
    setTimeout(() => {
        document.querySelectorAll('.stat-value').forEach(el => {
            el.style.opacity = 0;
            el.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                el.style.opacity = 1;
            }, 300);
        });
    }, 500);
}); 