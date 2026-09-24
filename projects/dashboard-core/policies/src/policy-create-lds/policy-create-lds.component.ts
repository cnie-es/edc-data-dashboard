import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'lib-policy-create-lds',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSlideToggleModule],
  templateUrl: './policy-create-lds.component.html',
  styleUrls: ['./policy-create-lds.component.css'],
})
export class PolicyCreateLdsComponent {
  currentStep = 1;

  policyName = '';
  policyDescription = '';
  legalText = '';
  opcionDesarrolloProductos: number | null = null;

  restriccionUsoAceptable = {
    habilitado: false,

    uso_interno_estricto: false,
    uso_interno_amplio: false,
    uso_externo: false,

    no_permitido: false,
    solo_llm: false,
    todos_menos_llm: false,
    cualquier_producto: false,

    liberacion_publica: false,
    liberacion_privada: false,
  };

  obligaciones = [
    {
      titulo: 'Obligación de atribución',
      descripcion: 'El consumidor debe dar crédito...',
      activo: false,
    },
    {
      titulo: 'Obligación de adjuntar política',
      descripcion: 'Debe adjuntar políticas...',
      activo: false,
    },
    {
      titulo: 'Derivados no permitidos',
      descripcion: 'No se autorizan obras derivadas',
      activo: false,
    },
  ];

  restricciones = [
    {
      titulo:
        'Se permite para uso interno estricto (sin uso por parte de filiales, subsidiarias y entidades afiliadas)',
      descripcion:
        'Por «uso estrictamente interno» se entiende cualquier uso interno limitado exclusivamente al destinatario de los datos como entidad jurídica única, de modo que solo sus propios empleados y contratistas individuales, que actúen bajo su control directo, puedan acceder a los datos o utilizarlos. No se permite el acceso, la divulgación ni el uso por parte de ninguna filial, subsidiaria, empresa matriz, miembro del consorcio, codesarrollador o cualquier otra entidad relacionada o tercera parte.',
      activo: false,
    },
    {
      titulo:
        'Se permite para uno interno amplio (incluidas filiales y subsidiarias y entidades afiliadas (miembros de consorcios, codesarrolladores, etc.))',
      descripcion:
        'Por «uso interno amplio» se entiende el uso interno por parte del destinatario y de sus filiales, subsidiarias y otras entidades estrechamente relacionadas, siempre que cada entidad esté sujeta a restricciones equivalentes y no se permita acceso a terceros no relacionados.',
      activo: false,
    },
    {
      titulo:
        'Se permite para uso externo (distribución, concesión de licencias adicionales de los Datos, intercambio de los Datos)',
      descripcion: '',
      activo: false,
    },
    {
      titulo: 'Solo no comercial',
      descripcion:
        'Por «uso no comercial» se entiende cualquier uso académico, educativo, de estudio personal o proyectos de interés público, sin generar ventajas comerciales.',
      activo: false,
    },
    {
      titulo: 'Comercial y no comercial',
      descripcion:
        'Uso comercial: cualquier uso destinado a obtener ventajas económicas, monetización, marketing, venta/licencia de Datos derivados, etc.',
      activo: false,
    },

    {
      titulo: 'No derivado',
      descripcion: 'Los datos originales sólo pueden utilizarse en su forma inalterada, sin cambios ni modificaciones.',
      activo: false,
    },
    {
      titulo: 'Permitido derivado',
      descripcion: 'Creación de conjuntos de datos derivados, agregaciones, transformaciones.',
      activo: false,
    },

    {
      titulo: 'No permitido',
      descripcion: 'No se permite usar los datos para el desarrollo de ningún producto',
      activo: false,
    },
    {
      titulo: 'Solo LLM',
      descripcion:
        'Se permite únicamente para el desarrollo de modelos lingüísticos grandes. ¿Se permite la liberación pública de los productos derivados? Se permite publicar abiertamente los productos derivados o solo uso privado.',
      activo: false,
    },
    {
      titulo: 'Todos menos LLM',
      descripcion:
        'Permitido para desarrollo de productos excepto modelos lingüísticos grandes. ¿Se permite la liberación pública de los productos derivados? Se permite publicar abiertamente los productos derivados o solo uso privado.',
      activo: false,
    },
    {
      titulo: 'Cualquier producto',
      descripcion:
        'Se permite usar los datos para el desarrollo de cualquier producto. ¿Se permite la liberación pública de los productos derivados? Se permite publicar abiertamente los productos derivados o solo uso privado.',
      activo: false,
    },
  ];

  restriccionesDetalle = {
    uso_interno_estricto: false,
    uso_interno_amplio: false,
    uso_externo: false,

    solo_no_comercial: false,
    comercial_y_no_comercial: false,

    no_derivado: false,
    permitido_derivado: false,

    no_permitido: false,
    solo_llm: false,
    todos_menos_llm: false,
    cualquier_producto: false,

    liberacion_publica_solo_llm: false,
    liberacion_privada_solo_llm: false,
    liberacion_publica_todos_menos_llm: false,
    liberacion_privada_todos_menos_llm: false,
    liberacion_publica_cualquier_producto: false,
    liberacion_privada_cualquier_producto: false,
  };

  next() {
    if (this.currentStep === 3) {
      // Reiniciar ambos a falso
      this.restricciones[7].activo = false;
      this.restricciones[8].activo = false;

      // Activar solo la opción seleccionada
      if (this.opcionDesarrolloProductos !== null) {
        this.restricciones[this.opcionDesarrolloProductos].activo = true;
      }
    }

    this.currentStep++;
  }

  prev() {
    if (this.currentStep > 1) this.currentStep--;
  }

  get obligacionesActivas() {
    return this.obligaciones.filter(o => o.activo);
  }

  get restriccionesActivas() {
    const lista = this.restricciones.filter(r => r.activo);

    if (this.restriccionUsoAceptable.habilitado) {
      lista.push({
        titulo: 'Restricciones de uso aceptable',
        descripcion: this.formatearRestriccionesUsoAceptable(),
        activo: true,
      });
    }

    return lista;
  }

  formatearRestriccionesUsoAceptable() {
    const r = this.restriccionUsoAceptable;
    const seleccionadas = [];

    if (r.uso_interno_estricto) seleccionadas.push('Uso interno estricto');
    if (r.uso_interno_amplio) seleccionadas.push('Uso interno amplio');
    if (r.uso_externo) seleccionadas.push('Uso externo');

    if (r.no_permitido) seleccionadas.push('No permitido desarrollo');
    if (r.solo_llm) seleccionadas.push('Solo LLM');
    if (r.todos_menos_llm) seleccionadas.push('Todos excepto LLM');
    if (r.cualquier_producto) seleccionadas.push('Cualquier producto');

    if (r.liberacion_publica) seleccionadas.push('Liberación pública');
    if (r.liberacion_privada) seleccionadas.push('No liberación pública');

    return seleccionadas.join(', ');
  }
}
