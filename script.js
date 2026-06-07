// Data Configurations for Line Chart
const ctxLine = document.getElementById('lineChart').getContext('2d');
new Chart(ctxLine, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Predicted Trend (Regression)',
            data: [30, 45, 35, 60, 49, 70],
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { display: false } }
    }
});

// Data Configurations for Bar Chart
const ctxBar = document.getElementById('barChart').getContext('2d');
new Chart(ctxBar, {
    type: 'bar',
    data: {
        labels: ['Cluster A', 'Cluster B', 'Cluster C', 'Cluster D'],
        datasets: [{
            label: 'Data Density',
            data: [1200, 1900, 800, 1500],
            backgroundColor: ['#34d399', '#38bdf8', '#fb923c', '#a78bfa'],
            borderWidth: 0,
            borderRadius: 6
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { display: false } }
    }
});