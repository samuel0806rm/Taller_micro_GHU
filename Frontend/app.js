document.addEventListener('DOMContentLoaded', () => {
    // **IMPORTANTE: ACTUALIZA ESTA URL A LA RUTA DE TU PROYECTO LARAVEL**
    // Si tu proyecto Laravel está en http://localhost/mi_proyecto_laravel/public, la URL sería:
     const API_BASE_URL = 'http://127.0.0.1:8000/api'; 

   

    // --- Elementos del DOM ---
    const sprintForm = document.getElementById('sprintForm');
    const sprintIdInput = document.getElementById('sprintId');
    const saveSprintBtn = document.getElementById('saveSprintBtn');
    const cancelEditSprintBtn = document.getElementById('cancelEditSprintBtn');
    const sprintNombreInput = document.getElementById('sprintNombre');
    const sprintFechaInicioInput = document.getElementById('sprintFechaInicio');
    const sprintFechaFinInput = document.getElementById('sprintFechaFin');

    const historiaForm = document.getElementById('historiaForm');
    const historiaIdInput = document.getElementById('historiaId');
    const saveHistoriaBtn = document.getElementById('saveHistoriaBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const historiaSprintSelect = document.getElementById('historiaSprint');
    const historiasPorSprintContainer = document.getElementById('historiasPorSprintContainer');
    const refreshHistoriasBtn = document.getElementById('refreshHistoriasBtn');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportResponsableInput = document.getElementById('reportResponsable');
    const reportOutput = document.getElementById('reportOutput');

    // --- Funciones de Utilidad ---

    // Función genérica para hacer peticiones Fetch a la API
    async function makeApiRequest(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        };
        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const responseText = await response.text(); // Leer la respuesta como texto primero

            let result;
            try {
                result = JSON.parse(responseText); // Intentar parsear a JSON
            } catch (e) {
                // Si falla el parseo, la respuesta no es JSON (ej. error HTML, texto simple)
                result = { message: `Respuesta no JSON o error del servidor: ${responseText}`, originalError: e };
            }

            if (!response.ok) {
                let errorMessage = 'Error en la solicitud.';
                // Preferir el mensaje del servidor si existe
                if (result.message) {
                    errorMessage = result.message;
                } else if (result.errors) {
                    // Si Laravel devuelve errores de validación
                    errorMessage += '\n' + Object.values(result.errors).flat().join('\n');
                } else if (result.data) { // Para errores personalizados como "Historia no encontrada"
                    errorMessage += '\n' + result.data;
                }
                alert(errorMessage);
                console.error('Error API:', response.status, result);
                throw new Error(errorMessage);
            }
            return result;
        } catch (error) {
            console.error('Error de red o parseo:', error);
            alert('Hubo un problema de conexión o con el servidor. Consulta la consola para más detalles.');
            throw error; // Propaga el error para que pueda ser manejado por la función que llama
        }
    }

    // --- Funciones para Sprints ---

    // Cargar sprints en el select de historias
    async function loadSprintsIntoDropdown() {
        try {
            const result = await makeApiRequest(`${API_BASE_URL}/sprints`);
            historiaSprintSelect.innerHTML = ''; // Limpiar opciones existentes

            if (result.data && result.data.length > 0) {
                result.data.forEach(sprint => {
                    const option = document.createElement('option');
                    option.value = sprint.id;
                    option.textContent = `${sprint.nombre} (Inicio: ${sprint.fecha_inicio}, Fin: ${sprint.fecha_fin})`;
                    historiaSprintSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay sprints disponibles';
                option.disabled = true;
                option.selected = true;
                historiaSprintSelect.appendChild(option);
            }
        } catch (error) {
            // Error ya manejado en makeApiRequest
        }
    }

    // Manejar envío de formulario de Sprint (Crear/Editar)
    sprintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = sprintIdInput.value;
        const nombre = sprintNombreInput.value;
        const fecha_inicio = sprintFechaInicioInput.value;
        const fecha_fin = sprintFechaFinInput.value;

        const data = { nombre, fecha_inicio, fecha_fin };

        let method = 'POST';
        let url = `${API_BASE_URL}/sprints`;
        let successMessage = 'Sprint creado exitosamente.';

        if (id) { // Si hay un ID, estamos editando
            method = 'PUT';
            url = `${API_BASE_URL}/sprints/${id}`;
            successMessage = 'Sprint actualizado exitosamente.';
        }

        try {
            const result = await makeApiRequest(url, method, data);
            alert(result.message);
            sprintForm.reset();
            sprintIdInput.value = ''; // Limpiar ID para futuras creaciones
            saveSprintBtn.textContent = 'Crear Sprint'; // Volver al texto original
            cancelEditSprintBtn.style.display = 'none'; // Ocultar botón de cancelar
            loadSprintsIntoDropdown(); // Recargar sprints para el dropdown de historias
            loadHistoriasPorSprint(); // Actualizar la lista de historias
        } catch (error) {
            // Error ya manejado en makeApiRequest
        }
    });

    // Función para precargar formulario de Sprint para edición
    async function editSprint(id) {
        try {
            const result = await makeApiRequest(`${API_BASE_URL}/sprints/${id}`);
            const sprint = result.data;

            sprintIdInput.value = sprint.id;
            sprintNombreInput.value = sprint.nombre;
            sprintFechaInicioInput.value = sprint.fecha_inicio;
            sprintFechaFinInput.value = sprint.fecha_fin;

            saveSprintBtn.textContent = 'Actualizar Sprint';
            cancelEditSprintBtn.style.display = 'inline-block';
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Desplazarse al formulario
        } catch (error) {
            // Error ya manejado en makeApiRequest
        }
    }

    // Función para eliminar Sprint
    async function deleteSprint(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este sprint y todas sus historias asociadas?')) {
            try {
                const result = await makeApiRequest(`${API_BASE_URL}/sprints/${id}`, 'DELETE');
                alert(result.data || 'Sprint eliminado exitosamente.');
                loadSprintsIntoDropdown(); // Recargar sprints para el dropdown
                loadHistoriasPorSprint(); // Actualizar la lista de historias
            } catch (error) {
                // Error ya manejado en makeApiRequest
            }
        }
    }

    // Botón para cancelar edición de Sprint
    cancelEditSprintBtn.addEventListener('click', () => {
        sprintForm.reset();
        sprintIdInput.value = '';
        saveSprintBtn.textContent = 'Crear Sprint';
        cancelEditSprintBtn.style.display = 'none';
    });


    // --- Funciones para Historias ---

    // Cargar y mostrar historias agrupadas por sprint
    async function loadHistoriasPorSprint() {
        try {
            const result = await makeApiRequest(`${API_BASE_URL}/sprints/historias`);
            historiasPorSprintContainer.innerHTML = ''; // Limpiar contenido anterior

            if (result.data && result.data.length > 0) {
                result.data.forEach(sprint => {
                    const sprintCard = document.createElement('div');
                    sprintCard.className = 'sprint-card';
                    sprintCard.dataset.id = sprint.id; // Añadir ID al data-set para edición/eliminación

                    sprintCard.innerHTML = `
                        <h3>${sprint.nombre} (Inicio: ${sprint.fecha_inicio} - Fin: ${sprint.fecha_fin})</h3>
                        <div class="sprint-actions">
                            <button class="edit-sprint-btn" data-id="${sprint.id}">Editar Sprint</button>
                            <button class="delete-sprint-btn" data-id="${sprint.id}">Eliminar Sprint</button>
                        </div>
                    `;

                    if (sprint.historias && sprint.historias.length > 0) {
                        const historiasList = document.createElement('div');
                        sprint.historias.forEach(historia => {
                            const historiaItem = document.createElement('div');
                            historiaItem.className = 'story-item';
                            historiaItem.innerHTML = `
                                <h4>${historia.titulo} (Puntos: ${historia.puntos})</h4>
                                <p><strong>Descripción:</strong> ${historia.descripcion}</p>
                                <p><strong>Responsable:</strong> ${historia.responsable}</p>
                                <p><strong>Estado:</strong> ${historia.estado}</p>
                                <p><strong>Creación:</strong> ${historia.fecha_creacion}</p>
                                ${historia.fecha_finalizacion ? `<p><strong>Finalización:</strong> ${historia.fecha_finalizacion}</p>` : ''}
                                <div class="actions">
                                    <button class="edit-btn" data-id="${historia.id}">Editar</button>
                                    <button class="delete-btn" data-id="${historia.id}">Eliminar</button>
                                </div>
                            `;
                            historiasList.appendChild(historiaItem);
                        });
                        sprintCard.appendChild(historiasList);
                    } else {
                        sprintCard.innerHTML += '<p>No hay historias para este sprint.</p>';
                    }
                    historiasPorSprintContainer.appendChild(sprintCard);
                });
            } else {
                historiasPorSprintContainer.innerHTML = '<p>No hay sprints o historias disponibles.</p>';
            }
        } catch (error) {
            // Error ya manejado en makeApiRequest
        }
    }

    // Manejar envío de formulario de Historia (Crear/Editar)
    historiaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = historiaIdInput.value;
        const titulo = document.getElementById('historiaTitulo').value;
        const descripcion = document.getElementById('historiaDescripcion').value;
        const responsable = document.getElementById('historiaResponsable').value;
        const estado = document.getElementById('historiaEstado').value;
        const puntos = document.getElementById('historiaPuntos').value;
        const fecha_creacion = document.getElementById('historiaFechaCreacion').value;
        const sprint_id = document.getElementById('historiaSprint').value;

        const data = {
            titulo,
            descripcion,
            responsable,
            estado,
            puntos: parseInt(puntos),
            fecha_creacion,
            sprint_id: parseInt(sprint_id)
        };

        // Si el estado es 'finalizada' y no hay fecha_finalizacion, la añadimos.
        // Si el estado no es 'finalizada', nos aseguramos de que fecha_finalizacion sea null.
        if (estado === 'finalizada') {
            data.fecha_finalizacion = new Date().toISOString().slice(0, 10); // Fecha actual
        } else {
            data.fecha_finalizacion = null;
        }

        let method = 'POST';
        let url = `${API_BASE_URL}/historias`;
        let successMessage = 'Historia creada exitosamente.';

        if (id) { // Si hay un ID, estamos editando
            method = 'PUT';
            url = `${API_BASE_URL}/historias/${id}`;
            successMessage = 'Historia actualizada exitosamente.';
        }

        try {
            const result = await makeApiRequest(url, method, data);
            alert(result.message);
            historiaForm.reset();
            historiaIdInput.value = ''; // Limpiar ID para futuras creaciones
            saveHistoriaBtn.textContent = 'Guardar Historia'; // Volver al texto original
            cancelEditBtn.style.display = 'none'; // Ocultar botón de cancelar
            loadHistoriasPorSprint(); // Actualizar la lista de historias
        } catch (error) {
            // Error ya manejado en makeApiRequest
        }
    });

    // Función para precargar formulario para edición de Historia
    async function editHistoria(id) {
        try {
            const result = await makeApiRequest(`${API_BASE_URL}/historias/${id}`);
            const historia = result.data;

            historiaIdInput.value = historia.id;
            document.getElementById('historiaTitulo').value = historia.titulo;
            document.getElementById('historiaDescripcion').value = historia.descripcion;
            document.getElementById('historiaResponsable').value = historia.responsable;
            document.getElementById('historiaEstado').value = historia.estado;
            document.getElementById('historiaPuntos').value = historia.puntos;
            document.getElementById('historiaFechaCreacion').value = historia.fecha_creacion;
            // Asegúrate de que el sprint_id exista en el dropdown
            if (historia.sprint_id) {
                historiaSprintSelect.value = historia.sprint_id;
            } else {
                historiaSprintSelect.value = ''; // Seleccionar opción por defecto si no tiene sprint
            }


            saveHistoriaBtn.textContent = 'Actualizar Historia';
            cancelEditBtn.style.display = 'inline-block';
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Desplazarse al formulario
        } catch (error) {
            // Error ya manejado en makeApiRequest
        }
    }

    // Función para eliminar historia
    async function deleteHistoria(id) {
        if (confirm('¿Estás seguro de que quieres eliminar esta historia de usuario?')) {
            try {
                const result = await makeApiRequest(`${API_BASE_URL}/historias/${id}`, 'DELETE');
                alert(result.data || 'Historia eliminada exitosamente.');
                loadHistoriasPorSprint(); // Actualizar la lista
            } catch (error) {
                // Error ya manejado en makeApiRequest
            }
        }
    }

    // --- Manejo de Eventos Dinámicos ---
    // Usamos delegación de eventos para los botones de editar/eliminar Sprints y Historias
    historiasPorSprintContainer.addEventListener('click', (e) => {
        // Eventos para Historias
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            editHistoria(id);
        } else if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            deleteHistoria(id);
        }
        // Eventos para Sprints
        else if (e.target.classList.contains('edit-sprint-btn')) {
            const id = e.target.dataset.id;
            editSprint(id);
        } else if (e.target.classList.contains('delete-sprint-btn')) {
            const id = e.target.dataset.id;
            deleteSprint(id);
        }
    });

    // Botón para cancelar edición de Historia
    cancelEditBtn.addEventListener('click', () => {
        historiaForm.reset();
        historiaIdInput.value = '';
        saveHistoriaBtn.textContent = 'Guardar Historia';
        cancelEditBtn.style.display = 'none';
    });

    // Botón para actualizar la lista de historias
    refreshHistoriasBtn.addEventListener('click', loadHistoriasPorSprint);

    // --- Funciones para Informes ---

    // Generar informe estilizado en tabla
    generateReportBtn.addEventListener('click', async () => {
        const responsable = reportResponsableInput.value.trim();
        let url = `${API_BASE_URL}/historias/reporte`; // Usa '/reporte' como en tu app.js
        if (responsable) {
            url += `?responsable=${encodeURIComponent(responsable)}`;
        }

        try {
            const result = await makeApiRequest(url);

            let reportHTML = '<table>';
            reportHTML += '<thead><tr><th>Métrica</th><th>Valor</th></tr></thead><tbody>';
            reportHTML += `<tr><td>Responsable</td><td>${result.responsable || 'N/A'}</td></tr>`; // Añadir N/A si no hay responsable
            reportHTML += `<tr><td>Total de Historias</td><td>${result.total_historias}</td></tr>`;
            reportHTML += `<tr><td>Historias Finalizadas</td><td>${result.finalizadas}</td></tr>`;
            reportHTML += `<tr><td>Historias Pendientes</td><td>${result.pendientes}</td></tr>`;
            reportHTML += `<tr><td>Historias en Impedimento</td><td>${result.impedimentos}</td></tr>`;
            reportHTML += '</tbody></table>';

            reportOutput.innerHTML = reportHTML;

        } catch (error) {
            reportOutput.innerHTML = '<p class="error-message">Error al generar el informe.</p>';
            // Puedes agregar más detalles del error a la consola si es necesario
        }
    });

    // --- Inicialización al cargar la página ---
    async function initializeApp() {
        await loadSprintsIntoDropdown(); // Primero carga los sprints
        loadHistoriasPorSprint(); // Luego carga las historias y los sprints con sus botones
    }

    initializeApp();
});