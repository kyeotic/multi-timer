import { For, type JSX, mergeProps, Show, splitProps } from 'solid-js'
import { createFormControl, type IFormControl } from 'solid-forms'
import classnames from 'classnames'

import Label from '../Label/Label'

export default function TextInput(
  props: JSX.InputHTMLAttributes<HTMLInputElement> & {
    control?: IFormControl<string>
    label?: string
    labelClass?: string
  },
): JSX.Element {
  // here we provide a default form control in case the user doesn't supply one

  let [local, rest] = splitProps(
    mergeProps({ control: createFormControl(''), type: 'text' }, props),
    ['control', 'class', 'label', 'labelClass', 'type', 'id'],
  )

  return (
    <div
      class="mb-2"
      classList={{
        'is-invalid': !!local.control.errors,
        'is-touched': local.control.isTouched,
        'is-required': local.control.isRequired,
      }}
    >
      <Show when={local.label}>
        <Label for={local.id} class={local.labelClass}>
          {local.label}
        </Label>
      </Show>
      <input
        {...rest}
        type={local.type}
        value={local.control.value}
        oninput={(e) => {
          local.control.setValue(e.currentTarget.value)
        }}
        onblur={() => local.control.markTouched(true)}
        required={local.control.isRequired}
        class={classnames(
          local.class,
          'shadow-sm appearance-none border rounded-sm w-full py-2 px-3 text-gray-700 leading-tight focus:outline-hidden focus:shadow-outline',
        )}
      />
      <Show when={local.control.isTouched && !local.control.isValid}>
        <For each={Object.values(local.control.errors!)}>
          {(errorMsg: string) => (
            <small class="text-red-600 text-base pl-1">{errorMsg}</small>
          )}
        </For>
      </Show>
    </div>
  )
}
